import { Select } from '../Select';
import { ANALYTICS_PERIOD_OPTIONS } from '../../lib/api/analytics';
import type { AnalyticsPageFilters } from '../../lib/analytics/period';
import type { Organization } from '../../types/organization';
import type { Project } from '../../types/project';
import { AnalyticsMetricInfo } from './AnalyticsMetricInfo';

export function AnalyticsToolbar({
  filters,
  organizations,
  projectOptions,
  periodLabel,
  compareCaption,
  caption,
  onChange,
}: {
  filters: AnalyticsPageFilters;
  organizations: Organization[];
  projectOptions: Project[];
  periodLabel: string | undefined;
  compareCaption: string | null;
  caption: string;
  onChange: (next: AnalyticsPageFilters) => void;
}) {
  const extraOpen = filters.period === 'custom' || filters.compareMode === 'custom';

  return (
    <header className="analytics-toolbar">
      <div className="analytics-toolbar-title">
        <h2>Analytics</h2>
        <AnalyticsMetricInfo label="Analytics clocks">{caption}</AnalyticsMetricInfo>
      </div>

      <div className="analytics-toolbar-controls">
        <label className="board-filter-field analytics-toolbar-field">
          Organization
          <Select
            value={filters.organizationId}
            onChange={(value) =>
              onChange({ ...filters, organizationId: value, projectId: '' })
            }
            options={[
              { value: '', label: 'All organizations' },
              ...organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              })),
            ]}
          />
        </label>
        <label className="board-filter-field analytics-toolbar-field">
          Project
          <Select
            value={filters.projectId}
            onChange={(value) => onChange({ ...filters, projectId: value })}
            options={[
              { value: '', label: 'All projects' },
              ...projectOptions.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </label>

        <div
          className="board-view-toggle analytics-period-toggle"
          role="group"
          aria-label="Time window"
        >
          {ANALYTICS_PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`board-view-toggle-btn${filters.period === option.value ? ' is-active' : ''}`}
              aria-pressed={filters.period === option.value}
              onClick={() =>
                onChange({
                  ...filters,
                  period: option.value,
                  compareMode: option.value === 'all' ? 'previous' : filters.compareMode,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {periodLabel ? (
        <p className="analytics-period-caption">
          {periodLabel}
          {compareCaption ? ` vs ${compareCaption}` : ''}
        </p>
      ) : null}

      <details className="analytics-extra" open={extraOpen || undefined}>
        <summary>Dates and comparison</summary>
        {filters.period === 'custom' && (
          <div className="analytics-date-row">
            <label className="board-filter-field">
              From
              <input
                type="date"
                value={filters.from}
                onChange={(event) => onChange({ ...filters, from: event.target.value })}
              />
            </label>
            <label className="board-filter-field">
              To
              <input
                type="date"
                value={filters.to}
                onChange={(event) => onChange({ ...filters, to: event.target.value })}
              />
            </label>
          </div>
        )}

        {filters.period !== 'all' && (
          <div className="analytics-date-row">
            <label className="board-filter-field">
              Compared with
              <Select
                value={filters.compareMode}
                onChange={(value) =>
                  onChange({
                    ...filters,
                    compareMode: value === 'custom' ? 'custom' : 'previous',
                  })
                }
                options={[
                  { value: 'previous', label: 'Previous window' },
                  { value: 'custom', label: 'Another range' },
                ]}
              />
            </label>
            {filters.compareMode === 'custom' && (
              <>
                <label className="board-filter-field">
                  Compare from
                  <input
                    type="date"
                    value={filters.compareFrom}
                    onChange={(event) =>
                      onChange({ ...filters, compareFrom: event.target.value })
                    }
                  />
                </label>
                <label className="board-filter-field">
                  Compare to
                  <input
                    type="date"
                    value={filters.compareTo}
                    onChange={(event) =>
                      onChange({ ...filters, compareTo: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}
      </details>
    </header>
  );
}
