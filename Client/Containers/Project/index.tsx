import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import ProjectList from './ProjectList';
import ProjectDetail from './ProjectDetail';

const Project: React.FC = () => {
  return (
    <Routes>
      <Route path=":projectId/*" element={<ProjectDetail />} />
      <Route path="*" element={<ProjectList />} />
    </Routes>
  );
};

export default Project;

