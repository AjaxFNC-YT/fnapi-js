import type { EpicRestClient } from './rest.js';

export const STATUS_BASE_URL = 'https://status.epicgames.com';

export const STATUS_FORTNITE_PATTERN = /fortnite/i;

export type StatusIndicator = 'none' | 'minor' | 'major' | 'critical' | (string & {});

export type ComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance'
  | (string & {});

export type IncidentImpact = 'none' | 'maintenance' | 'minor' | 'major' | 'critical' | (string & {});

export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'
  | 'postmortem'
  | (string & {});

export type MaintenanceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'verifying'
  | 'completed'
  | (string & {});

export interface StatusPage {
  id: string;
  name: string;
  url: string;
  time_zone?: string;
  updated_at: string;
}

export interface StatusSummaryStatus {
  indicator: StatusIndicator;
  description: string;
}

export interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatus;
  created_at: string;
  updated_at: string;
  position: number;
  description: string | null;
  showcase: boolean;
  start_date: string | null;
  group_id: string | null;
  page_id: string;
  group: boolean;
  only_show_if_degraded: boolean;
  components?: string[];
}

export interface StatusIncidentUpdate {
  id: string;
  status: IncidentStatus;
  body: string;
  incident_id: string;
  created_at: string;
  updated_at: string;
  display_at: string;
  affected_components?: StatusAffectedComponent[] | null;
  deliver_notifications?: boolean;
  custom_tweet?: string | null;
  tweet_id?: string | null;
}

export interface StatusAffectedComponent {
  code: string;
  name: string;
  old_status: ComponentStatus;
  new_status: ComponentStatus;
}

export interface StatusIncident {
  id: string;
  name: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  monitoring_at: string | null;
  resolved_at: string | null;
  impact: IncidentImpact;
  shortlink: string;
  started_at: string;
  page_id: string;
  incident_updates: StatusIncidentUpdate[];
  components?: StatusComponent[];
}

export interface StatusMaintenance extends StatusIncident {
  scheduled_for: string | null;
  scheduled_until: string | null;
}

export interface StatusSummary {
  page: StatusPage;
  status: StatusSummaryStatus;
  components: StatusComponent[];
  incidents: StatusIncident[];
  scheduled_maintenances: StatusMaintenance[];
}

export interface StatusResponse {
  page: StatusPage;
  status: StatusSummaryStatus;
}

export interface StatusComponentsResponse {
  page: StatusPage;
  components: StatusComponent[];
}

export interface StatusIncidentsResponse {
  page: StatusPage;
  incidents: StatusIncident[];
}

export interface StatusMaintenancesResponse {
  page: StatusPage;
  scheduled_maintenances: StatusMaintenance[];
}

export interface StatusOptions {
  signal?: AbortSignal;
}

export class EpicStatusManager {
  constructor(private readonly rest: EpicRestClient) {}

  private get<T>(path: string, options?: StatusOptions): Promise<T> {
    return this.rest
      .request<T>('GET', path, options?.signal ? { signal: options.signal } : {})
      .then((response) => response.data);
  }

  summary(options?: StatusOptions): Promise<StatusSummary> {
    return this.get<StatusSummary>('/api/v2/summary.json', options);
  }

  status(options?: StatusOptions): Promise<StatusResponse> {
    return this.get<StatusResponse>('/api/v2/status.json', options);
  }

  components(options?: StatusOptions): Promise<StatusComponent[]> {
    return this.get<StatusComponentsResponse>('/api/v2/components.json', options).then(
      (response) => response.components,
    );
  }

  incidents(options?: StatusOptions): Promise<StatusIncident[]> {
    return this.get<StatusIncidentsResponse>('/api/v2/incidents.json', options).then(
      (response) => response.incidents,
    );
  }

  unresolvedIncidents(options?: StatusOptions): Promise<StatusIncident[]> {
    return this.get<StatusIncidentsResponse>('/api/v2/incidents/unresolved.json', options).then(
      (response) => response.incidents,
    );
  }

  maintenances(options?: StatusOptions): Promise<StatusMaintenance[]> {
    return this.get<StatusMaintenancesResponse>('/api/v2/scheduled-maintenances.json', options).then(
      (response) => response.scheduled_maintenances,
    );
  }

  activeMaintenances(options?: StatusOptions): Promise<StatusMaintenance[]> {
    return this.get<StatusMaintenancesResponse>(
      '/api/v2/scheduled-maintenances/active.json',
      options,
    ).then((response) => response.scheduled_maintenances);
  }

  upcomingMaintenances(options?: StatusOptions): Promise<StatusMaintenance[]> {
    return this.get<StatusMaintenancesResponse>(
      '/api/v2/scheduled-maintenances/upcoming.json',
      options,
    ).then((response) => response.scheduled_maintenances);
  }

  async fortniteComponents(options?: StatusOptions): Promise<StatusComponent[]> {
    const components = await this.components(options);
    return components.filter(
      (component) => !component.group && STATUS_FORTNITE_PATTERN.test(component.name),
    );
  }

  async isFortniteOperational(options?: StatusOptions): Promise<boolean> {
    const components = await this.fortniteComponents(options);
    if (components.length === 0) return true;
    return components.every((component) => component.status === 'operational');
  }
}
