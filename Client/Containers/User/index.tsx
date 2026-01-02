import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Profile from './Profile';
import Settings from './Settings';
import Notifications from './Notifications';
import NotificationSettings from './NotificationSettings';
import MyProjects from './MyProjects';
import MyStars from './MyStars';
import Statistics from './Statistics';

const User: React.FC = () => {
  return (
    <Routes>
      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<Settings />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="notification-settings" element={<NotificationSettings />} />
      <Route path="projects" element={<MyProjects />} />
      <Route path="stars" element={<MyStars />} />
      <Route path="statistics" element={<Statistics />} />
      <Route path="*" element={<Navigate to="profile" replace />} />
    </Routes>
  );
};

export default User;

