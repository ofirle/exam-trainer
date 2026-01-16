import { useState, useEffect } from 'react';
import { Card, Radio, Button, Space, Tag, Alert, Typography, Image, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  TrophyOutlined,
  EyeOutlined,
  WarningOutlined,
  ForwardOutlined,
  EditOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { Question, QuestionProgress } from '../lib/types';

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
import { CONFIG } from '../lib/constants';
import { isMastered } from '../lib/algorithm';
import { reverseText } from '../lib/textUtils';
import { useStore } from '../lib/store';
import { EditQuestionModal } from './EditQuestionModal';
import { isQuestionReviewed } from '../lib/reviewStorage';

const { Text, Paragraph } = Typography;

interface QuestionCardProps {
  question: Question;
  progress?: QuestionProgress;
  onSubmit: (selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => void;
  onNext?: () => void;
  onSkip?: () => void;
  onDontKnow?: () => void;
  showStats?: boolean;
  showFeedback?: boolean;
  mode?: 'training' | 'exam';
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  progress,
  onSubmit,
  onNext,
  onSkip,
  onDontKnow,
  showStats = true,
  showFeedback = true,
  mode = 'training',
}) => {
  const { categories, updateQuestion } = useStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isDontKnow, setIsDontKnow] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Find the correct answer index
  const correctIndex = question.options.findIndex((opt) => opt.key === question.answer);

  // Reset state when question changes
  useEffect(() => {
    setSelectedIndex(null);
    setSubmitted(false);
    setIsCorrect(false);
    setIsDontKnow(false);
  }, [question.id]);

  const handleSubmit = () => {
    if (selectedIndex === null) return;

    const correct = selectedIndex === correctIndex;
    const selectedOptionKey = question.options[selectedIndex]?.key || '';
    const correctOptionKey = question.answer;
    setIsCorrect(correct);
    setSubmitted(true);
    onSubmit(selectedIndex, correct, selectedOptionKey, correctOptionKey);
  };

  const handleDontKnow = () => {
    setIsDontKnow(true);
    setSubmitted(true);
    setIsCorrect(false);
    onDontKnow?.();
  };

  const handleNext = () => {
    onNext?.();
  };

  const handleEditSave = (updatedQuestion: Question) => {
    updateQuestion(updatedQuestion);
    setIsEditModalOpen(false);
  };

  const getOptionStyle = (index: number): React.CSSProperties => {
    if (!submitted) return {};

    if (index === correctIndex) {
      return {
        backgroundColor: '#f6ffed',
        borderColor: '#b7eb8f',
        borderRadius: 4,
        padding: '8px 12px',
        margin: '4px 0',
      };
    }

    if (index === selectedIndex && !isCorrect) {
      return {
        backgroundColor: '#fff2f0',
        borderColor: '#ffccc7',
        borderRadius: 4,
        padding: '8px 12px',
        margin: '4px 0',
      };
    }

    return {
      padding: '8px 12px',
      margin: '4px 0',
    };
  };

  const mastered = progress ? isMastered(progress) : false;
  const reviewed = isQuestionReviewed(question.id);

  return (
    <>
      <Card
        title={
          <Space>
            <span>Question #{question.id}</span>
            {question.category && <Tag color="blue">{question.category}</Tag>}
            {mastered && (
              <Tag icon={<TrophyOutlined />} color="gold">
                Mastered
              </Tag>
            )}
            {reviewed && (
              <Tag icon={<CheckCircleFilled />} color="green">
                Reviewed
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space size="small">
            <Tooltip title="Edit question">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditModalOpen(true);
                }}
              />
            </Tooltip>
            {showStats && progress && progress.seenCount > 0 && (
              <>
                <Tag icon={<EyeOutlined />}>Seen: {progress.seenCount}</Tag>
                <Tag
                  icon={<CheckCircleOutlined />}
                  color={progress.correctStreak >= CONFIG.MASTER_STREAK ? 'green' : 'default'}
                >
                  Streak: {progress.correctStreak}
                </Tag>
                {progress.wrongCount > 0 && (
                  <Tag icon={<WarningOutlined />} color="orange">
                    Wrong: {progress.wrongCount}
                  </Tag>
                )}
              </>
            )}
          </Space>
        }
      >
        <Paragraph style={{ fontSize: 16, marginBottom: 24, direction: 'rtl' }}>
          {reverseText(question.question)}
        </Paragraph>

        {getQuestionImages(question).length > 0 && (
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Image.PreviewGroup>
              <Space wrap style={{ justifyContent: 'center' }}>
                {getQuestionImages(question).map((img, idx) => (
                  <Image
                    key={idx}
                    src={img}
                    alt={`Question ${question.id} image ${idx + 1}`}
                    style={{ maxWidth: '100%', maxHeight: 400 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </div>
        )}

        <Radio.Group
          value={selectedIndex}
          onChange={(e) => !submitted && setSelectedIndex(e.target.value)}
          style={{ width: '100%' }}
          disabled={submitted}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {question.options.map((option, index) => (
              <div key={option.key} style={getOptionStyle(index)}>
                <Radio value={index} style={{ alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      <Text
                        strong={submitted && index === correctIndex}
                        delete={submitted && index === selectedIndex && !isCorrect}
                        style={{ direction: 'rtl' }}
                      >
                        {option.key}. {reverseText(option.text)}
                      </Text>
                      {submitted && index === correctIndex && (
                        <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
                      )}
                      {submitted && index === selectedIndex && !isCorrect && (
                        <CloseCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />
                      )}
                    </div>
                    {option.image && (
                      <div style={{ marginTop: 4, marginLeft: 20 }}>
                        <Image
                          src={option.image}
                          alt={`Option ${option.key}`}
                          style={{ maxWidth: 200, maxHeight: 150, borderRadius: 4 }}
                        />
                      </div>
                    )}
                  </div>
                </Radio>
              </div>
            ))}
          </Space>
        </Radio.Group>

        {showFeedback && submitted && (
          <Alert
            message={isDontKnow ? "Marked as 'I Don't Know'" : (isCorrect ? 'Correct!' : 'Incorrect')}
            type={isCorrect ? 'success' : (isDontKnow ? 'warning' : 'error')}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!submitted ? (
            <>
              {onSkip && (
                <Button
                  onClick={onSkip}
                  size="large"
                  icon={<ForwardOutlined />}
                >
                  Skip
                </Button>
              )}
              {onDontKnow && mode === 'training' && (
                <Button
                  onClick={handleDontKnow}
                  size="large"
                  icon={<QuestionCircleOutlined />}
                >
                  I Don't Know
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleSubmit}
                disabled={selectedIndex === null}
                size="large"
              >
                Submit Answer
              </Button>
            </>
          ) : (
            mode === 'training' && onNext && (
              <Button type="primary" onClick={handleNext} size="large">
                Next Question
              </Button>
            )
          )}
        </div>
      </Card>

      <EditQuestionModal
        question={question}
        open={isEditModalOpen}
        categories={categories}
        onSave={handleEditSave}
        onCancel={() => setIsEditModalOpen(false)}
      />
    </>
  );
};
