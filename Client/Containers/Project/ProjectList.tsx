import React, { useEffect, useState } from 'react';
import { Card, Button, List, Avatar, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchProjects, createProject } from '../../Reducer/Modules/Project';
import { fetchGroups } from '../../Reducer/Modules/Group';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const ProjectList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, loading } = useSelector((state: RootState) => state.project);
  const { groups } = useSelector((state: RootState) => state.group);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await dispatch(createProject(values)).unwrap();
      message.success(t('project.createSuccess'));
      setModalVisible(false);
      form.resetFields();
      dispatch(fetchProjects());
    } catch (error: any) {
      message.error(error.message || t('message.createFailed'));
    }
  };

  return (
    <div>
      <Card
        title={t('project.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('project.create')}
          </Button>
        }
      >
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={projects}
          loading={loading}
          renderItem={(item) => (
            <List.Item>
              <Card
                hoverable
                style={{ width: '100%' }}
                onClick={() => navigate(`/project/${item._id}`)}
              >
                <Card.Meta
                  avatar={
                    <Avatar
                      style={{ backgroundColor: item.color || '#1890ff' }}
                      icon={item.icon}
                    />
                  }
                  title={item.project_name}
                  description={item.project_desc}
                />
              </Card>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={t('project.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="group_id"
            label={t('project.group')}
            rules={[{ required: true, message: t('project.groupRequired') }]}
          >
            <Select placeholder={t('project.groupPlaceholder')}>
              {groups.map((group) => (
                <Select.Option key={group._id} value={group._id}>
                  {group.group_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="project_name"
            label={t('project.projectName')}
            rules={[{ required: true, message: t('project.nameRequired') }]}
          >
            <Input placeholder={t('project.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="project_desc" label={t('common.description')}>
            <Input.TextArea placeholder={t('project.descPlaceholder')} rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;

