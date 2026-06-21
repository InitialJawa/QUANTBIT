import { DataSources } from "../types";
import { DataBadge } from "./DataBadge";

export function DataSourcesRow({ dataSources }: { dataSources: DataSources }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(dataSources).map(([key, src]) => (
        <span key={key} className="inline-flex items-center gap-1 text-caption text-white/60 uppercase tracking-wider mr-1">
          <span className="text-white/40">{key}:</span>
          <DataBadge status={src} />
        </span>
      ))}
    </div>
  );
}
