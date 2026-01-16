import { useState, useMemo } from 'react';
import { Typography, Table, Input, Button, Space, Tag, Statistic, Row, Col, Card } from 'antd';
import { EditOutlined, DownloadOutlined, UploadOutlined, PictureOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import questionsData from '../data/questions.json';
import type { Question } from '../lib/types';
import { EditQuestionModal } from '../components/EditQuestionModal';
import { reverseText } from '../lib/textUtils';
import { isQuestionReviewed, getReviewedCount } from '../lib/reviewStorage';

// Helper to check if question has images
const hasImages = (q: Question): boolean => {
  return (q.images && q.images.length > 0) || !!q.image;
};

const { Title } = Typography;
const { Search } = Input;

export const QuestionManager: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>(questionsData as Question[]);
  const [searchText, setSearchText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render when review status changes

  const reviewedCount = useMemo(() => getReviewedCount(), [refreshKey]);

  const filteredQuestions = useMemo(() => {
    if (!searchText) return questions;
    const lowerSearch = searchText.toLowerCase();
    return questions.filter(
      (q) =>
        reverseText(q.question).toLowerCase().includes(lowerSearch) ||
        q.category?.toLowerCase().includes(lowerSearch) ||
        q.id.toString().includes(lowerSearch)
    );
  }, [questions, searchText]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    questions.forEach((q) => {
      if (q.category) cats.add(q.category);
    });
    return Array.from(cats);
  }, [questions]);

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  const handleSave = (updatedQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    setIsModalOpen(false);
    setEditingQuestion(null);
    setRefreshKey((k) => k + 1); // Refresh to update review status
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
    setRefreshKey((k) => k + 1); // Refresh to update review status
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'questions.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Question[];
        setQuestions(imported);
      } catch (err) {
        console.error('Failed to import questions:', err);
      }
    };
    input.click();
  };

  const columns: ColumnsType<Question> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Question',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      render: (text: string) => (
        <span style={{ direction: 'rtl', display: 'block' }}>{reverseText(text)}</span>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: categories.map((cat) => ({ text: cat, value: cat })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => category && <Tag>{category}</Tag>,
    },
    {
      title: 'Image',
      key: 'image',
      width: 60,
      render: (_, record) =>
        hasImages(record) ? (
          <PictureOutlined style={{ color: '#1890ff', fontSize: 16 }} />
        ) : null,
      filters: [
        { text: 'Has Image', value: 'yes' },
        { text: 'No Image', value: 'no' },
      ],
      onFilter: (value, record) =>
        value === 'yes' ? hasImages(record) : !hasImages(record),
    },
    {
      title: 'Reviewed',
      key: 'reviewed',
      width: 80,
      render: (_, record) =>
        isQuestionReviewed(record.id) ? (
          <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
        ) : null,
      filters: [
        { text: 'Reviewed', value: 'yes' },
        { text: 'Not Reviewed', value: 'no' },
      ],
      onFilter: (value, record) =>
        value === 'yes' ? isQuestionReviewed(record.id) : !isQuestionReviewed(record.id),
    },
    {
      title: 'Answer',
      dataIndex: 'answer',
      key: 'answer',
      width: 80,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <EditOutlined style={{ marginRight: 8 }} />
          Question Manager
        </Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Review Progress"
              value={reviewedCount}
              suffix={`/ ${questions.length}`}
              valueStyle={{ color: reviewedCount === questions.length ? '#52c41a' : undefined }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Remaining"
              value={questions.length - reviewedCount}
              valueStyle={{ color: questions.length - reviewedCount > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Completion"
              value={Math.round((reviewedCount / questions.length) * 100)}
              suffix="%"
              valueStyle={{ color: reviewedCount === questions.length ? '#52c41a' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Search
          placeholder="Search by text, category, or ID..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button icon={<UploadOutlined />} onClick={handleImport}>
          Import JSON
        </Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          Export JSON
        </Button>
      </Space>

      <Table
        dataSource={filteredQuestions}
        columns={columns}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} questions`,
        }}
        onRow={(record) => ({
          onClick: () => handleEdit(record),
          style: { cursor: 'pointer' },
        })}
      />

      <EditQuestionModal
        question={editingQuestion}
        open={isModalOpen}
        categories={categories}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};
