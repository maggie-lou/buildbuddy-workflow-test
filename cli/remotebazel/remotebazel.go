package remotebazel

import (
	"bytes"
	"context"
	"crypto/sha256"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/buildbuddy-io/buildbuddy/server/util/grpc_client"
	"github.com/buildbuddy-io/buildbuddy/server/util/status"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/google/uuid"
	"golang.org/x/sys/unix"
	"google.golang.org/grpc/metadata"

	bblog "github.com/buildbuddy-io/buildbuddy/cli/logging"
	bbspb "github.com/buildbuddy-io/buildbuddy/proto/buildbuddy_service"
	elpb "github.com/buildbuddy-io/buildbuddy/proto/eventlog"
	rnpb "github.com/buildbuddy-io/buildbuddy/proto/runner"
)

const (
	escapeSeq = "\u001B["
)

var (
	defaultBranchRefs = []string{"refs/heads/main", "refs/heads/master"}
)

func consoleCursorMoveUp(y int) {
	fmt.Print(escapeSeq + strconv.Itoa(y) + "A")
}

func consoleCursorMoveBeginningLine() {
	fmt.Print(escapeSeq + "1G")
}

func consoleDeleteLines(n int) {
	fmt.Print(escapeSeq + strconv.Itoa(n) + "M")
}

type RunOpts struct {
	Server string
	APIKey string
	Args   []string
}

type RepoConfig struct {
	Root      string
	URL       string
	CommitSHA string
	Patches   []string
}

func determineRemote(repo *git.Repository) (*git.Remote, error) {
	remotes, err := repo.Remotes()
	if err != nil {
		return nil, err
	}

	if len(remotes) == 0 {
		return nil, status.FailedPreconditionError("the git repository must have a remote configured to use remote Bazel")
	}
	if len(remotes) > 1 {
		// TODO(vadim): allow user to pick
		return nil, status.UnimplementedError("repositories with multiple remotes are not yet supported")
	}

	remote := remotes[0]
	if len(remote.Config().URLs) == 0 {
		return nil, status.FailedPreconditionErrorf("remote %q does not have a fetch URL", remote.Config().Name)
	}

	return remote, nil
}

func determineDefaultBranch(repo *git.Repository) (string, error) {
	branches, err := repo.Branches()
	if err != nil {
		return "", status.UnknownErrorf("could not list branches: %s", err)
	}

	allBranches := make(map[string]struct{})
	err = branches.ForEach(func(branch *plumbing.Reference) error {
		allBranches[string(branch.Name())] = struct{}{}
		return nil
	})
	if err != nil {
		return "", status.UnknownErrorf("could not iterate over branches: %s", err)
	}

	for _, defaultBranch := range defaultBranchRefs {
		if _, ok := allBranches[defaultBranch]; ok {
			return defaultBranch, nil
		}
	}

	return "", status.NotFoundErrorf("could not determine default branch")
}

func runGit(args ...string) (string, error) {
	stdout := bytes.Buffer{}
	stderr := bytes.Buffer{}
	cmd := exec.Command("git", args...)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if _, ok := err.(*exec.ExitError); ok {
			return stdout.String(), err
		}
		return stdout.String(), status.UnknownErrorf("error running git %s: %s\n%s", args, err, stderr.String())
	}
	return stdout.String(), nil
}

func diffUntrackedFile(path string) (string, error) {
	patch, err := runGit("diff", "--no-index", "/dev/null", path)
	if err != nil {
		if _, ok := err.(*exec.ExitError); ok {
			return patch, nil
		}
		return "", err
	}

	return patch, nil
}

func Config(path string) (*RepoConfig, error) {
	repo, err := git.PlainOpenWithOptions(path, &git.PlainOpenOptions{DetectDotGit: true})
	if err != nil {
		return nil, err
	}

	remote, err := determineRemote(repo)
	if err != nil {
		return nil, err
	}
	if len(remote.Config().URLs) == 0 {
		return nil, status.FailedPreconditionErrorf("remote %q does not have a fetch URL", remote.Config().Name)
	}
	fetchURL := remote.Config().URLs[0]

	bblog.Printf("Using fetch URL: %s", fetchURL)

	defaultBranchRef, err := determineDefaultBranch(repo)
	if err != nil {
		return nil, err
	}

	bblog.Printf("Using base branch: %s", defaultBranchRef)

	defaultBranchCommitHash, err := repo.ResolveRevision(plumbing.Revision(defaultBranchRef))
	if err != nil {
		return nil, status.UnknownErrorf("could not find commit hash for branch ref %q", defaultBranchRef)
	}

	bblog.Printf("Using base branch commit hash: %s", defaultBranchCommitHash)

	wt, err := repo.Worktree()
	if err != nil {
		return nil, status.UnknownErrorf("could not determine git repo root")
	}

	repoConfig := &RepoConfig{
		Root:      wt.Filesystem.Root(),
		URL:       fetchURL,
		CommitSHA: defaultBranchCommitHash.String(),
	}

	patch, err := runGit("diff", defaultBranchCommitHash.String())
	if err != nil {
		return nil, err
	}
	if patch != "" {
		repoConfig.Patches = append(repoConfig.Patches, patch)
	}

	// TODO(vadim): prompt user before uploading untracked files
	untrackedFiles, err := runGit("ls-files", "--others", "--exclude-standard")
	if err != nil {
		return nil, err
	}
	untrackedFiles = strings.Trim(untrackedFiles, "\n")
	if untrackedFiles != "" {
		for _, uf := range strings.Split(untrackedFiles, "\n") {
			patch, err := diffUntrackedFile(uf)
			if err != nil {
				return nil, err
			}
			repoConfig.Patches = append(repoConfig.Patches, patch)
		}
	}

	return repoConfig, nil
}

func getTermWidth() int {
	size, err := unix.IoctlGetWinsize(int(os.Stdout.Fd()), unix.TIOCGWINSZ)
	if err != nil {
		return 80
	}
	return int(size.Col)
}

func splitLogBuffer(buf []byte) []string {
	var lines []string

	termWidth := getTermWidth()
	for _, line := range strings.Split(string(buf), "\n") {
		for len(line) > termWidth {
			lines = append(lines, line[0:termWidth])
			line = line[termWidth:]
		}
		lines = append(lines, line)
	}
	return lines
}

func Run(ctx context.Context, opts RunOpts, repoConfig *RepoConfig) error {
	conn, err := grpc_client.DialTarget(opts.Server)
	if err != nil {
		return status.UnavailableErrorf("could not connect to BuildBuddy remote bazel service %q: %s", opts.Server, err)
	}
	bbClient := bbspb.NewBuildBuddyServiceClient(conn)

	ctx = metadata.AppendToOutgoingContext(ctx, "x-buildbuddy-api-key", opts.APIKey)

	bblog.Printf("Requesting command execution on remote Bazel instance.")

	instanceHash := sha256.New()
	instanceHash.Write(uuid.NodeID())
	instanceHash.Write([]byte(repoConfig.Root))

	req := &rnpb.RunRequest{
		GitRepo: &rnpb.RunRequest_GitRepo{
			RepoUrl: repoConfig.URL,
		},
		RepoState: &rnpb.RunRequest_RepoState{
			CommitSha: repoConfig.CommitSHA,
		},
		SessionAffinityKey: fmt.Sprintf("%x", instanceHash.Sum(nil)),
		BazelCommand:       strings.Join(opts.Args, " "),
	}

	for _, patch := range repoConfig.Patches {
		req.GetRepoState().Patch = append(req.GetRepoState().Patch, patch)
	}

	rsp, err := bbClient.Run(ctx, req)
	if err != nil {
		return status.UnknownErrorf("error running bazel: %s", err)
	}

	iid := rsp.GetInvocationId()

	bblog.Printf("Invocation ID: %s", iid)

	chunkID := ""
	moveBack := 0

	drawChunk := func(chunk *elpb.GetEventLogChunkResponse) {
		// Are we redrawing the current chunk?
		if moveBack > 0 {
			consoleCursorMoveUp(moveBack)
			consoleCursorMoveBeginningLine()
			consoleDeleteLines(moveBack)
		}

		logLines := splitLogBuffer(chunk.GetBuffer())
		if !chunk.GetLive() {
			moveBack = 0
		} else {
			moveBack = len(logLines)
		}

		for _, l := range logLines {
			_, _ = os.Stdout.Write([]byte(l))
			_, _ = os.Stdout.Write([]byte("\n"))
		}
	}

	var chunks []*elpb.GetEventLogChunkResponse
	wasLive := false
	for {
		l, err := bbClient.GetEventLogChunk(ctx, &elpb.GetEventLogChunkRequest{
			InvocationId: iid,
			ChunkId:      chunkID,
			MinLines:     100,
		})
		if err != nil {
			return status.UnknownErrorf("error streaming logs: %s", err)
		}

		chunks = append(chunks, l)
		// If the current chunk was live but is no longer then delay redraw
		// until the next chunk is retrieved. The "volatile" part of the
		// chunk moves to the next chunk when a chunk is finalized. Without
		// the delay, we would print the chunk without the volatile portion
		// which will look like a "flicker" once the volatile portion is
		// printed again.
		if !wasLive || l.GetLive() {
			for _, chunk := range chunks {
				drawChunk(chunk)
			}
			chunks = nil
		}
		wasLive = l.GetLive()

		if l.GetNextChunkId() == "" {
			break
		}

		if l.GetNextChunkId() == chunkID {
			time.Sleep(1 * time.Second)
		}
		chunkID = l.GetNextChunkId()
	}

	return nil
}
