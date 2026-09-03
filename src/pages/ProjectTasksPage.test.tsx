import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ProjectTasksPage } from './ProjectTasksPage';

function BoardProbe() {
  const location = useLocation();
  return (
    <div>
      All tasks at {location.pathname}
      {location.search}
    </div>
  );
}

describe('ProjectTasksPage', () => {
  it('redirects the dedicated project board to All tasks with filters', () => {
    render(
      <MemoryRouter initialEntries={['/organizations/org-1/projects/proj-1']}>
        <Routes>
          <Route
            path="/organizations/:orgId/projects/:projectId"
            element={<ProjectTasksPage />}
          />
          <Route path="/board" element={<BoardProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        'All tasks at /board?organizationId=org-1&projectId=proj-1',
      ),
    ).toBeInTheDocument();
  });
});
