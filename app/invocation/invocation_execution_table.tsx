import React from "react";
import format from "../format/format";
import {
  getExecutionStatus,
  totalDuration,
  queuedDuration,
  downloadDuration,
  executionDuration,
  uploadDuration,
  getActionPageLink,
} from "./invocation_execution_util";
import { execution_stats } from "../../proto/execution_stats_ts_proto";
import DigestComponent from "../components/digest/digest";
import Link from "../components/link/link";
import { digestToString } from "../util/cache";

interface Props {
  executions: execution_stats.Execution[];
  invocationIdProvider: (exec: execution_stats.Execution) => string;
}

export default class InvocationExecutionTable extends React.Component<Props> {
  render() {
    return (
      <div className="invocation-execution-table">
        {this.props.executions.map((execution, index) => {
          const status = getExecutionStatus(execution);
          if (!execution.actionDigest) {
            return;
          }
          return (
            <Link
              key={index}
              className="invocation-execution-row"
              href={getActionPageLink(this.props.invocationIdProvider(execution), execution)}>
              <div className="invocation-execution-row-image">{status.icon}</div>
              <div>
                <div className="invocation-execution-row-header">
                  <span className="invocation-execution-row-header-status">{status.name}</span>
                  <DigestComponent digest={execution.actionDigest} expanded={true} />
                </div>
                <div>{execution.commandSnippet}</div>
                <div className="invocation-execution-row-stats">
                  <div>Executor Host ID: {execution.executedActionMetadata?.worker}</div>
                  <div>Total duration: {format.durationUsec(totalDuration(execution))}</div>
                  <div>Queued duration: {format.durationUsec(queuedDuration(execution))}</div>
                  <div>
                    File download duration: {format.durationUsec(downloadDuration(execution))} (
                    {format.bytes(execution.executedActionMetadata?.ioStats?.fileDownloadSizeBytes ?? 0)} across{" "}
                    {format.formatWithCommas(execution?.executedActionMetadata?.ioStats?.fileDownloadCount)} files)
                  </div>
                  <div>Execution duration: {format.durationUsec(executionDuration(execution))}</div>
                  <div>
                    File upload duration: {format.durationUsec(uploadDuration(execution))} (
                    {format.bytes(execution.executedActionMetadata?.ioStats?.fileUploadSizeBytes ?? 0)} across{" "}
                    {format.formatWithCommas(execution?.executedActionMetadata?.ioStats?.fileUploadCount)} files)
                  </div>
                </div>
                {execution.status?.code !== 0 && execution.status?.message && (
                  <div className="invocation-execution-row-status-message">{execution.status.message}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }
}
