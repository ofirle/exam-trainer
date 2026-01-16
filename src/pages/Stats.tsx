import { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Modal,
  Upload,
  message,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  TrophyOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  FireOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '../lib/store';
import { calculateStats, getQuestionProgress } from '../lib/algorithm';
import { exportStateToJson, importStateFromJson } from '../lib/storage';
import { CONFIG } from '../lib/constants';
import { reverseText } from '../lib/textUtils';
import type { UploadProps } from 'antd';

const { Title, Text } = Typography;

export const Stats: React.FC = () => {
  const { state, questions, resetProgress, getQuestionById } = useStore();
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const stats = calculateStats(questions, state);

  const masteryPercent = Math.round((stats.masteredCount / stats.totalQuestions) * 100);
  const coveragePercent = Math.round((stats.seenCount / stats.totalQuestions) * 100);

  const handleExport = () => {
    const json = exportStateToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-trainer-progress-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('Progress exported successfully');
  };

  const handleImport: UploadProps['beforeUpload'] = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const result = await importStateFromJson(content);

      if (result.success) {
        message.success('Progress imported successfully. Please refresh the page.');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        message.error(`Import failed: ${result.error}`);
      }
    };
    reader.readAsText(file);
    return false; // Prevent auto upload
  };

  const handleReset = () => {
    resetProgress();
    setResetModalVisible(false);
    message.success('Progress reset successfully');
  };

  const weakestColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => <Tag>#{id}</Tag>,
    },
    {
      title: 'Question',
      key: 'question',
      ellipsis: true,
      render: (_: unknown, record: { id: number }) => {
        const question = getQuestionById(record.id);
        const displayText = question ? reverseText(question.question) : '';
        return (
          <Tooltip title={displayText}>
            <Text ellipsis style={{ maxWidth: 300, direction: 'rtl' }}>
              {displayText}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Category',
      key: 'category',
      width: 120,
      render: (_: unknown, record: { id: number }) => {
        const question = getQuestionById(record.id);
        return question?.category ? <Tag color="blue">{question.category}</Tag> : '-';
      },
    },
    {
      title: 'Wrong',
      dataIndex: 'wrongCount',
      key: 'wrongCount',
      width: 80,
      render: (count: number) => (
        <Tag color={count > 3 ? 'red' : count > 1 ? 'orange' : 'default'}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Streak',
      dataIndex: 'correctStreak',
      key: 'correctStreak',
      width: 80,
      render: (streak: number) => (
        <Tag color={streak >= CONFIG.MASTER_STREAK ? 'green' : 'default'}>
          {streak}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: unknown, record: { correctStreak: number }) => {
        if (record.correctStreak >= CONFIG.MASTER_STREAK) {
          return (
            <Tag icon={<TrophyOutlined />} color="gold">
              Mastered
            </Tag>
          );
        }
        return (
          <Tag icon={<FireOutlined />} color="orange">
            Learning
          </Tag>
        );
      },
    },
  ];

  const recentColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => <Tag>#{id}</Tag>,
    },
    {
      title: 'Question',
      key: 'question',
      ellipsis: true,
      render: (_: unknown, record: { id: number }) => {
        const question = getQuestionById(record.id);
        const displayText = question ? reverseText(question.question) : '';
        return (
          <Tooltip title={displayText}>
            <Text ellipsis style={{ maxWidth: 300, direction: 'rtl' }}>
              {displayText}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeenAtCounter',
      key: 'lastSeenAtCounter',
      width: 120,
      render: (counter: number) => (
        <Text type="secondary">@ answer #{counter}</Text>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 150,
      render: (_: unknown, record: { id: number }) => {
        const progress = getQuestionProgress(state, record.id);
        return (
          <Space size="small">
            <Tooltip title="Seen count">
              <Tag icon={<EyeOutlined />}>{progress.seenCount}</Tag>
            </Tooltip>
            <Tooltip title="Correct streak">
              <Tag
                icon={<CheckCircleOutlined />}
                color={progress.correctStreak >= CONFIG.MASTER_STREAK ? 'green' : 'default'}
              >
                {progress.correctStreak}
              </Tag>
            </Tooltip>
            {progress.wrongCount > 0 && (
              <Tooltip title="Wrong count">
                <Tag icon={<WarningOutlined />} color="orange">
                  {progress.wrongCount}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>
        <TrophyOutlined style={{ marginRight: 8 }} />
        Statistics & Progress
      </Title>

      {/* Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Answers"
              value={stats.totalAnswers}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Mastered"
              value={stats.masteredCount}
              suffix={`/ ${stats.totalQuestions}`}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <Progress
              percent={masteryPercent}
              size="small"
              status="active"
              strokeColor="#faad14"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Seen"
              value={stats.seenCount}
              suffix={`/ ${stats.totalQuestions}`}
              prefix={<EyeOutlined />}
            />
            <Progress percent={coveragePercent} size="small" status="active" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Unseen"
              value={stats.unseenCount}
              prefix={<QuestionCircleOutlined />}
              valueStyle={{ color: stats.unseenCount > 0 ? '#1890ff' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Mastery Progress */}
      <Card title="Mastery Progress" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Progress
              percent={masteryPercent}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              format={(percent) => `${percent}% Mastered`}
            />
          </Col>
          <Col>
            <Text type="secondary">
              {stats.masteredCount} of {stats.totalQuestions} questions
            </Text>
          </Col>
        </Row>
        <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
          <Col flex="auto">
            <Progress
              percent={coveragePercent}
              strokeColor="#1890ff"
              format={(percent) => `${percent}% Coverage`}
            />
          </Col>
          <Col>
            <Text type="secondary">
              {stats.seenCount} of {stats.totalQuestions} questions seen
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#fa541c' }} />
                Weakest Questions (Top 20)
              </Space>
            }
          >
            <Table
              dataSource={stats.weakestQuestions}
              columns={weakestColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 500 }}
              locale={{ emptyText: 'No data yet. Start training!' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <EyeOutlined style={{ color: '#1890ff' }} />
                Recently Seen (Top 20)
              </Space>
            }
          >
            <Table
              dataSource={stats.recentlySeen}
              columns={recentColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 500 }}
              locale={{ emptyText: 'No data yet. Start training!' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <Card title="Data Management" style={{ marginTop: 24 }}>
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export Progress
          </Button>

          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleImport}
          >
            <Button icon={<UploadOutlined />}>Import Progress</Button>
          </Upload>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setResetModalVisible(true)}
          >
            Reset All Progress
          </Button>
        </Space>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        title="Reset Progress"
        open={resetModalVisible}
        onOk={handleReset}
        onCancel={() => setResetModalVisible(false)}
        okText="Yes, Reset"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to reset all progress? This will delete all your
          training data, exam history, and statistics.
        </p>
        <p>
          <strong>This action cannot be undone.</strong>
        </p>
      </Modal>
    </div>
  );
};
