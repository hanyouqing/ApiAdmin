import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, message, List, Avatar, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '../../Reducer/Modules/Group';
import { api } from '../../Utils/api';
import type { AppDispatch, RootState } from '../../Reducer/Create';
import type { Group } from '../../Reducer/Modules/Group';
import { getAvatarUrl } from '../../Utils/avatar';

const Group: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { groups, loading } = useSelector((state: RootState) => state.group);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [memberForm] = Form.useForm();

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingGroup(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Group) => {
    setEditingGroup(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('group.deleteConfirm'),
      content: t('group.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await dispatch(deleteGroup(id)).unwrap();
          message.success(t('group.deleteSuccess'));
        } catch (error: any) {
          message.error(error.message || t('message.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingGroup) {
        await dispatch(updateGroup({ id: editingGroup._id, data: values })).unwrap();
        message.success(t('group.updateSuccess'));
      } else {
        await dispatch(createGroup(values)).unwrap();
        message.success(t('group.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || t('message.operationFailed'));
    }
  };

  const handleManageMembers = (record: Group) => {
    setSelectedGroup(record);
    setMemberModalVisible(true);
  };

  const handleAddMember = async () => {
    if (!selectedGroup) return;
    try {
      const values = await memberForm.validateFields();
      await api.post('/group/member/add', {
        group_id: selectedGroup._id,
        member_email: values.email,
      });
      message.success(t('group.member.addSuccess'));
      memberForm.resetFields();
      dispatch(fetchGroups());
    } catch (error: any) {
      message.error(error.response?.data?.message || t('group.member.addFailed'));
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedGroup) return;
    Modal.confirm({
      title: t('group.member.removeConfirm'),
      content: t('group.member.removeConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete('/group/member/del', {
            params: { group_id: selectedGroup._id, member_id: memberId },
          });
          message.success(t('group.member.removeSuccess'));
          dispatch(fetchGroups());
          setSelectedGroup(null);
        } catch (error: any) {
          message.error(error.response?.data?.message || t('group.member.removeFailed'));
        }
      },
    });
  };

  const handleSetLeader = (memberId: string) => {
    if (!selectedGroup) return;
    Modal.confirm({
      title: t('group.member.setLeaderConfirm'),
      content: t('group.member.setLeaderConfirmMessage'),
      onOk: async () => {
        try {
          await api.post('/group/member/setLeader', {
            group_id: selectedGroup._id,
            member_id: memberId,
          });
          message.success(t('group.member.setLeaderSuccess'));
          dispatch(fetchGroups());
          setSelectedGroup(null);
        } catch (error: any) {
          message.error(error.response?.data?.message || t('group.member.setLeaderFailed'));
        }
      },
    });
  };

  const columns = [
    {
      title: t('group.groupName'),
      dataIndex: 'group_name',
      key: 'group_name',
    },
    {
      title: t('common.description'),
      dataIndex: 'group_desc',
      key: 'group_desc',
    },
    {
      title: t('group.memberCount'),
      key: 'member_count',
      render: (_: any, record: Group) => (
        <Tag icon={<TeamOutlined />}>
          {Array.isArray(record.member) ? record.member.length : 0} {t('group.members')}
        </Tag>
      ),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 250,
      render: (_: any, record: Group) => (
        <Space>
          <Button
            type="link"
            icon={<TeamOutlined />}
            onClick={() => handleManageMembers(record)}
          >
            {t('group.manageMembers')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={t('group.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('group.newGroup')}
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={groups}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingGroup ? t('group.edit') : t('group.create')}
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
            name="group_name"
            label={t('group.groupName')}
            rules={[{ required: true, message: t('group.nameRequired') }]}
          >
            <Input placeholder={t('group.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="group_desc" label={t('common.description')}>
            <Input.TextArea placeholder={t('group.descPlaceholder')} rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('group.member.title', { name: selectedGroup?.group_name })}
        open={memberModalVisible}
        onCancel={() => {
          setMemberModalVisible(false);
          setSelectedGroup(null);
          memberForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Tabs
          items={[
            {
              key: 'list',
              label: t('group.member.list'),
              children: (
                <List
                  dataSource={selectedGroup?.member || []}
                  renderItem={(member: any) => (
                    <List.Item
                      key={member._id || member}
                      actions={[
                        selectedGroup?.uid !== member._id && selectedGroup?.uid !== member ? (
                          <Space>
                            <Button
                              type="link"
                              onClick={() => handleSetLeader(member._id || member)}
                            >
                              {t('group.member.setLeader')}
                            </Button>
                            <Button
                              type="link"
                              danger
                              onClick={() => handleRemoveMember(member._id || member)}
                            >
                              {t('group.member.remove')}
                            </Button>
                          </Space>
                        ) : (
                          <Tag color="gold">{t('group.member.leader')}</Tag>
                        ),
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={getAvatarUrl(member.avatar)} icon={<UserOutlined />} />}
                        title={member.username || member}
                        description={member.email || ''}
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'add',
              label: t('group.member.add'),
              children: (
                <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
                  <Form.Item
                    name="email"
                    label={t('group.member.email')}
                    rules={[
                      { required: true, message: t('group.member.emailRequired') },
                      { type: 'email', message: t('group.member.emailInvalid') },
                    ]}
                  >
                    <Input placeholder={t('group.member.emailPlaceholder')} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" style={{ color: '#ffffff' }}>
                      {t('group.member.add')}
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default Group;

