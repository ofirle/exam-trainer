import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, theme } from 'antd';
import {
  ThunderboltOutlined,
  FileTextOutlined,
  BarChartOutlined,
  BookOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { StoreProvider } from './lib/store';
import { QuestionsProvider } from './lib/questionsStore';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/training',
      icon: <ThunderboltOutlined />,
      label: 'Training',
    },
    {
      key: '/exam',
      icon: <FileTextOutlined />,
      label: 'Exam',
    },
    {
      key: '/stats',
      icon: <BarChartOutlined />,
      label: 'Statistics',
    },
    {
      key: '/manage',
      icon: <SettingOutlined />,
      label: 'Manage',
    },
  ];

  return (
    <QuestionsProvider>
      <StoreProvider>
        <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 24 }}>
            <BookOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              Exam Trainer
            </Title>
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ flex: 1, minWidth: 0, border: 'none' }}
          />
        </Header>

        <Content style={{ padding: '24px 48px' }}>
          <div
            style={{
              background: colorBgContainer,
              minHeight: 'calc(100vh - 180px)',
              padding: 24,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          Exam Trainer - Practice makes perfect
        </Footer>
      </Layout>
      </StoreProvider>
    </QuestionsProvider>
  );
};
