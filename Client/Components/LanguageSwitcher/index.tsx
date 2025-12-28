import React from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setLocale } from '../../Reducer/Modules/UI';
import type { RootState } from '../../Reducer/Create';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const locale = useSelector((state: RootState) => state.ui.locale);

  const handleChange = (value: 'zh-CN' | 'en-US') => {
    i18n.changeLanguage(value);
    localStorage.setItem('locale', value);
    dispatch(setLocale(value));
    window.location.reload();
  };

  return (
    <Select
      value={locale}
      onChange={handleChange}
      style={{ width: 100 }}
      options={[
        { label: 'English', value: 'en-US' },
        { label: '中文', value: 'zh-CN' },
      ]}
    />
  );
};

export default LanguageSwitcher;

