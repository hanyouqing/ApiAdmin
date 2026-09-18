import React, { useEffect, useMemo } from 'react';
import { useParams, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Tabs } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchProjectDetail } from '../../Reducer/Modules/Project';
import Interface from './Interface';
import Setting from './Setting';
import Activity from './Activity';
import Test from './Test';
import Docs from './Docs';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const ProjectDetail: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { currentProject } = useSelector((state: RootState) => state.project);

  const routeKeywords = ['interface', 'test', 'setting', 'activity', 'docs'];

  const projectId = useMemo(() => {
    if (params.projectId) {
      if (routeKeywords.includes(params.projectId)) {
        const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
        if (pathMatch && pathMatch[1] && !routeKeywords.includes(pathMatch[1])) {
          return pathMatch[1];
        }
        return currentProject?._id || '';
      }
      return params.projectId;
    }

    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      const extractedId = pathMatch[1];
      if (routeKeywords.includes(extractedId)) {
        return currentProject?._id || '';
      }
      return extractedId;
    }

    return currentProject?._id || '';
  }, [params.projectId, location.pathname, currentProject?._id]);

  useEffect(() => {
    if (
      projectId &&
      !routeKeywords.includes(projectId) &&
      projectId.length > 0
    ) {
      dispatch(fetchProjectDetail(projectId));
    }
  }, [dispatch, projectId]);

  const activeKey = location.pathname.split('/').pop() || 'interface';

  const tabItems = [
    {
      key: 'interface',
      label: t('project.tabs.interface'),
    },
    {
      key: 'docs',
      label: t('project.tabs.docs'),
    },
    {
      key: 'test',
      label: t('project.tabs.test'),
    },
    {
      key: 'setting',
      label: t('project.tabs.setting'),
    },
    {
      key: 'activity',
      label: t('project.tabs.activity'),
    },
  ];

  const handleTabChange = (key: string) => {
    navigate(`/project/${projectId}/${key}`);
  };

  const isInterfacePath =
    activeKey === 'interface' || !['test', 'setting', 'activity', 'docs'].includes(activeKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 10,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: '0 0 16px 0' }}>
          {currentProject?.project_name || t('project.detail')}
        </h2>
        <Tabs activeKey={activeKey} items={tabItems} onChange={handleTabChange} />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="interface/*" element={<Interface />} />
          <Route path="docs" element={<Docs />} />
          <Route path="test" element={<Test />} />
          <Route path="setting" element={<Setting />} />
          <Route path="activity" element={<Activity />} />
          {isInterfacePath && <Route path="*" element={<Interface />} />}
        </Routes>
      </div>
    </div>
  );
};

export default ProjectDetail;
