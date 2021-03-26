#!/bin/bash
set -e

export BUILDBUDDY_HOST=$(kubectl get --namespace default service buildbuddy-enterprise -o jsonpath='{.status.loadBalancer.ingress[0].*}')
export CURRENT_DIR=$(pwd)

# Navigate to the BuildBuddy dir
cd ../../

# Print commands as we run them
set -x

# Start fresh
bazel clean

# Run a remote build against the new cluster
bazel build server \
  --bes_results_url=http://${BUILDBUDDY_HOST}/invocation/ \
  --bes_backend=grpc://${BUILDBUDDY_HOST}:1985 \
  --remote_cache=grpc://${BUILDBUDDY_HOST}:1985 \
  --remote_executor=grpc://${BUILDBUDDY_HOST}:1985 \
  --noremote_accept_cached \
  --remote_instance_name=$(date +%s) \
  --host_cpu=k8 --cpu=k8 \
  --crosstool_top=@buildbuddy_toolchain//:ubuntu1604_cc_toolchain_suite \
  --host_platform=@buildbuddy_toolchain//:platform_linux \
  --platforms=@buildbuddy_toolchain//:platform_linux \
  --extra_toolchains=@buildbuddy_toolchain//:ubuntu1604_cc_toolchain \
  --remote_download_minimal \
  --verbose_failures \
  --remote_upload_local_results \
  --remote_timeout=3600 \
  --jobs=100
  # Uncomment and move up for mac builds to work once esbuild supports RBE
  # https://bazelbuild.slack.com/archives/CEZUUKQ6P/p1616796872102700
  # --spawn_strategy=remote \
 
# Stop printing
set +x

# Back to where we started
cd $CURRENT_DIR
