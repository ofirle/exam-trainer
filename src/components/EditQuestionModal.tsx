import { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Radio,
  Button,
  Space,
  AutoComplete,
  Select,
  Image,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { Question, QuestionOption } from '../lib/types';
import { reverseText } from '../lib/textUtils';
import { AVAILABLE_IMAGES } from '../lib/constants';
import { isQuestionReviewed, toggleQuestionReviewed } from '../lib/reviewStorage';

// Helper to get all images from a question (handles legacy single image)
const getQuestionImages = (question: Question): string[] => {
  if (question.images && question.images.length > 0) {
    return question.images;
  }
  if (question.image) {
    return [question.image];
  }
  return [];
};

const { TextArea } = Input;

interface EditQuestionModalProps {
  question: Question | null;
  open: boolean;
  categories: string[];
  onSave: (question: Question) => void;
  onCancel: () => void;
}

interface EditFormProps {
  question: Question;
  categories: string[];
  onSave: (question: Question) => void;
  onCancel: () => void;
}

const HEBREW_KEYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

const EditForm: React.FC<EditFormProps> = ({
  question,
  categories,
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm();
  // Store options with reversed (readable) text for editing
  const [options, setOptions] = useState<QuestionOption[]>(
    question.options.map((opt) => ({ ...opt, text: reverseText(opt.text) }))
  );
  const [answer, setAnswer] = useState(question.answer);
  const [selectedImages, setSelectedImages] = useState<string[]>(getQuestionImages(question));
  const [isReviewed, setIsReviewed] = useState(() => isQuestionReviewed(question.id));

  const handleToggleReviewed = () => {
    const newStatus = toggleQuestionReviewed(question.id);
    setIsReviewed(newStatus);
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const validOptions = options
        .filter((opt) => opt.text.trim() !== '')
        .map((opt) => ({ ...opt, text: reverseText(opt.text) })); // Reverse back for storage
      const updatedQuestion: Question = {
        ...question,
        question: reverseText(values.question), // Reverse back for storage
        category: values.category || '',
        subCategory: values.subCategory || null,
        tags: values.tags || [],
        options: validOptions,
        answer: answer,
        images: selectedImages.length > 0 ? selectedImages : undefined,
        image: undefined, // Clear legacy field when using new images array
      };
      onSave(updatedQuestion);
    });
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    const nextKey = HEBREW_KEYS[options.length] || `${options.length + 1}`;
    setOptions([...options, { key: nextKey, text: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const removedKey = options[index].key;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (answer === removedKey) {
      setAnswer(newOptions[0]?.key || '');
    }
  };

  const categoryOptions = categories.map((cat) => ({ value: cat }));

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        question: reverseText(question.question), // Show readable text
        category: question.category || '',
        subCategory: question.subCategory || '',
        tags: question.tags || [],
      }}
    >
      <Form.Item
        name="question"
        label="Question Text"
        rules={[{ required: true, message: 'Question text is required' }]}
      >
        <TextArea rows={3} style={{ direction: 'rtl' }} />
      </Form.Item>

      <Space style={{ width: '100%' }} wrap>
        <Form.Item name="category" label="Category" style={{ minWidth: 200 }}>
          <AutoComplete
            options={categoryOptions}
            placeholder="Select or enter category"
            filterOption={(inputValue, option) =>
              option?.value.toLowerCase().includes(inputValue.toLowerCase()) ?? false
            }
          />
        </Form.Item>

        <Form.Item name="subCategory" label="Sub-Category" style={{ minWidth: 200 }}>
          <Input placeholder="Sub-category (optional)" />
        </Form.Item>
      </Space>

      <Form.Item name="tags" label="Tags">
        <Select
          mode="tags"
          placeholder="Add tags"
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="Images">
        <Select
          mode="multiple"
          placeholder="Select images"
          value={selectedImages}
          onChange={setSelectedImages}
          style={{ width: '100%' }}
          optionLabelProp="label"
        >
          {AVAILABLE_IMAGES.map((imagePath) => (
            <Select.Option key={imagePath} value={imagePath} label={imagePath.split('/').pop()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image
                  src={imagePath}
                  alt={imagePath}
                  width={40}
                  height={40}
                  style={{ objectFit: 'cover' }}
                  preview={false}
                />
                <span>{imagePath.split('/').pop()}</span>
              </div>
            </Select.Option>
          ))}
        </Select>
        {selectedImages.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedImages.map((img) => (
              <Image
                key={img}
                src={img}
                alt={img}
                width={80}
                height={80}
                style={{ objectFit: 'cover', borderRadius: 4 }}
              />
            ))}
          </div>
        )}
      </Form.Item>

      <Form.Item label="Answer Options">
        <Radio.Group
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {options.map((option, index) => (
              <div
                key={option.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Radio value={option.key} style={{ marginTop: 4 }} />
                <span style={{ minWidth: 24, marginTop: 4 }}>{option.key}.</span>
                <Input.TextArea
                  value={option.text}
                  onChange={(e) => handleOptionTextChange(index, e.target.value)}
                  placeholder={`Option ${option.key}`}
                  style={{ flex: 1, direction: 'rtl' }}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveOption(index)}
                  disabled={options.length <= 2}
                />
              </div>
            ))}
          </Space>
        </Radio.Group>
        <Button
          type="dashed"
          onClick={handleAddOption}
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          disabled={options.length >= HEBREW_KEYS.length}
        >
          Add Option
        </Button>
      </Form.Item>

      <div style={{ color: '#666', fontSize: 12 }}>
        Correct answer: {answer}
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          type={isReviewed ? 'primary' : 'default'}
          icon={isReviewed ? <CheckCircleFilled /> : <CheckCircleOutlined />}
          onClick={handleToggleReviewed}
          style={isReviewed ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}}
        >
          {isReviewed ? 'Reviewed' : 'Mark as Reviewed'}
        </Button>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
        </Space>
      </div>
    </Form>
  );
};

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  open,
  categories,
  onSave,
  onCancel,
}) => {
  return (
    <Modal
      title={`Edit Question #${question?.id}`}
      open={open}
      onCancel={onCancel}
      width={700}
      footer={null}
      destroyOnClose
    >
      {question && (
        <EditForm
          key={question.id}
          question={question}
          categories={categories}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
};
