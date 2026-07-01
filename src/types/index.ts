export interface Command {
  id: string;
  title: string;
  command: string;
  tags: string[];
  usage_count: number;
  last_used: string;
  created_at: string;
}

export interface Settings {
  clipboard_monitoring: boolean;
  sort_by: "frequency" | "recent" | "alpha";
  auto_start: boolean;
}

export type SortBy = "frequency" | "recent" | "alpha";
