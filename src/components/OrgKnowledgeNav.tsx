import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  fetchOrganizationKnowledgeAccess,
  fetchProjectKnowledgeAccess,
} from '../lib/api/knowledge';
import { useAuth } from '../context/AuthContext';

export function OrgKnowledgeNav() {
  const { orgId, projectId } = useParams();
  const { isAdmin } = useAuth();
  const [orgHasAccess, setOrgHasAccess] = useState(isAdmin);
  const [projectHasAccess, setProjectHasAccess] = useState(isAdmin);

  useEffect(() => {
    if (!orgId) return;
    if (isAdmin) {
      setOrgHasAccess(true);
      return;
    }

    let cancelled = false;
    void fetchOrganizationKnowledgeAccess(orgId)
      .then((status) => {
        if (!cancelled) setOrgHasAccess(status.hasAccess);
      })
      .catch(() => {
        if (!cancelled) setOrgHasAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, isAdmin]);

  useEffect(() => {
    if (!orgId || !projectId) {
      setProjectHasAccess(false);
      return;
    }
    if (isAdmin) {
      setProjectHasAccess(true);
      return;
    }

    let cancelled = false;
    void fetchProjectKnowledgeAccess(orgId, projectId)
      .then((status) => {
        if (!cancelled) setProjectHasAccess(status.hasAccess);
      })
      .catch(() => {
        if (!cancelled) setProjectHasAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, projectId, isAdmin]);

  if (!orgId) {
    return null;
  }

  return (
    <nav className="project-nav org-knowledge-nav">
      <p className="sidebar-label">Knowledge</p>
      <ul className="project-nav-list">
        {orgHasAccess && (
          <li>
            <NavLink
              to={`/organizations/${orgId}/knowledge`}
              className={({ isActive }) =>
                isActive ? 'project-nav-link active' : 'project-nav-link'
              }
            >
              Organization
            </NavLink>
          </li>
        )}
        <li>
          <NavLink
            to={`/organizations/${orgId}/persons`}
            className={({ isActive }) =>
              isActive ? 'project-nav-link active' : 'project-nav-link'
            }
          >
            People
          </NavLink>
        </li>
        {projectId && projectHasAccess && (
          <li>
            <NavLink
              to={`/organizations/${orgId}/projects/${projectId}/knowledge`}
              className={({ isActive }) =>
                isActive ? 'project-nav-link active' : 'project-nav-link'
              }
            >
              Project
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}
