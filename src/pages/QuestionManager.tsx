import { useState, useMemo } from 'react';
import { Typography, Table, Input, Button, Space, Tag } from 'antd';
import { EditOutlined, DownloadOutlined, UploadOutlined, PictureOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import questionsData from '../data/questions.json';
import type { Question } from '../lib/types';
import { EditQuestionModal } from '../components/EditQuestionModal';
import { reverseText } from '../lib/textUtils';

const { Title } = Typography;
const { Search } = Input;

export const QuestionManager: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>(questionsData as Question[]);
  const [searchText, setSearchText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
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
        record.image ? (
          <PictureOutlined style={{ color: '#1890ff', fontSize: 16 }} />
        ) : null,
      filters: [
        { text: 'Has Image', value: 'yes' },
        { text: 'No Image', value: 'no' },
      ],
      onFilter: (value, record) =>
        value === 'yes' ? !!record.image : !record.image,
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
