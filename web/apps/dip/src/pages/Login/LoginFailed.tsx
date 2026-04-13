import { Button, Result } from 'antd'
import intl from 'react-intl-universal'
import GradientContainer from '@/components/GradientContainer'
import { getFullPath } from '@/utils/config'

const LoginFailed = () => {
  const handleReturnLoginPage = () => {
    window.location.replace(getFullPath('/login'))
  }

  return (
    <GradientContainer className="w-full h-full flex items-center justify-center">
      <Result
        status="warning"
        subTitle={intl.get('login.failed.subtitle')}
        extra={
          <Button type="primary" onClick={handleReturnLoginPage}>
            {intl.get('login.failed.backToLogin')}
          </Button>
        }
      />
    </GradientContainer>
  )
}

export default LoginFailed
