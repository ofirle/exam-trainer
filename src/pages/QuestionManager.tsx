import { useState, useMemo } from 'react';
import { Typography, Table, Input, Button, Space, Tag, Statistic, Row, Col, Card, Spin, message, Select } from 'antd';
import { EditOutlined, DownloadOutlined, UploadOutlined, PictureOutlined, CheckCircleFilled, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Question, QuestionProgress } from '../lib/types';
import { EditQuestionModal } from '../components/EditQuestionModal';
import { reverseText } from '../lib/textUtils';
import { isQuestionReviewed, getReviewedCount } from '../lib/reviewStorage';
import { useQuestions } from '../lib/questionsStore';
import { useStore } from '../lib/store';
import { downloadExportData, importAllData } from '../lib/exportImport';
import { CONFIG } from '../lib/constants';

// Helper to check if question has images
const hasImages = (q: Question): boolean => {
  return (q.images && q.images.length > 0) || !!q.image;
};

const { Title } = Typography;
const { Search } = Input;

// Knowledge filter options
type KnowledgeFilter = 'all' | 'mastered' | 'learning' | 'wrong' | 'dontKnow' | 'skipped' | 'unseen';

const knowledgeFilterOptions: { value: KnowledgeFilter; label: string }[] = [
  { value: 'all', label: 'All Questions' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'learning', label: 'Learning' },
  { value: 'wrong', label: 'Wrong' },
  { value: 'dontKnow', label: "Don't Know" },
  { value: 'skipped', label: 'Skipped' },
  { value: 'unseen', label: 'Unseen' },
];

// Helper to get progress for a question
const getProgress = (progressById: Record<number, QuestionProgress>, questionId: number): QuestionProgress => {
  return progressById[questionId] || {
    seenCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    dueAfter: 0,
    lastSeenAtCounter: 0,
    dontKnowCount: 0,
    skipCount: 0,
  };
};

export const QuestionManager: React.FC = () => {
  const { questions, isLoading, isSeeding, updateQuestionInStore, seedDatabase } = useQuestions();
  const { state } = useStore();
  const [searchText, setSearchText] = useState('');
  const [knowledgeFilter, setKnowledgeFilter] = useState<KnowledgeFilter>('all');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render when review status changes
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const reviewedCount = useMemo(() => getReviewedCount(), [refreshKey]);

  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // Apply knowledge filter
    if (knowledgeFilter !== 'all') {
      filtered = filtered.filter((q) => {
        const progress = getProgress(state.progressById, q.id);
        switch (knowledgeFilter) {
          case 'mastered':
            return progress.correctStreak >= CONFIG.MASTER_STREAK;
          case 'learning':
            return progress.seenCount > 0 && progress.correctStreak < CONFIG.MASTER_STREAK;
          case 'wrong':
            return progress.wrongCount > 0;
          case 'dontKnow':
            return progress.dontKnowCount > 0;
          case 'skipped':
            return progress.skipCount > 0;
          case 'unseen':
            return progress.seenCount === 0;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          reverseText(q.question).toLowerCase().includes(lowerSearch) ||
          q.category?.toLowerCase().includes(lowerSearch) ||
          q.id.toString().includes(lowerSearch)
      );
    }

    return filtered;
  }, [questions, searchText, knowledgeFilter, state.progressById]);

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

  const handleSave = async (updatedQuestion: Question) => {
    await updateQuestionInStore(updatedQuestion);
    setIsModalOpen(false);
    setEditingQuestion(null);
    setRefreshKey((k) => k + 1); // Refresh to update review status
    message.success('Question saved successfully');
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
    setRefreshKey((k) => k + 1); // Refresh to update review status
  };

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      await downloadExportData();
      message.success('Export completed successfully');
    } catch (err) {
      console.error('Failed to export:', err);
      message.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportAll = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        setIsImporting(true);
        const text = await file.text();
        const data = JSON.parse(text);

        const result = await importAllData(data);

        if (result.success) {
          message.success(
            `Import completed! ${result.questionsCount} questions and ${result.progressCount} progress records imported.`
          );
          // Reload questions from database
          await seedDatabase();
          // Force refresh the page to reload state
          window.location.reload();
        } else {
          message.error(result.error || 'Import failed');
        }
      } catch (err) {
        console.error('Failed to import:', err);
        message.error('Failed to parse import file. Please ensure it is a valid JSON file.');
      } finally {
        setIsImporting(false);
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading questions..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <EditOutlined style={{ marginRight: 8 }} />
          Question Manager
          {(isSeeding || isImporting || isExporting) && (
            <SyncOutlined spin style={{ marginLeft: 12, fontSize: 18 }} />
          )}
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
        <Select
          value={knowledgeFilter}
          onChange={setKnowledgeFilter}
          options={knowledgeFilterOptions}
          style={{ width: 150 }}
          placeholder="Filter by knowledge"
        />
        <Button
          icon={<UploadOutlined />}
          onClick={handleImportAll}
          loading={isImporting}
        >
          Import All
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExportAll}
          loading={isExporting}
        >
          Export All
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
