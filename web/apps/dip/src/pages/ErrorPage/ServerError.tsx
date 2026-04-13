import { Result } from 'antd'
import intl from 'react-intl-universal'
import ServerErrorIcon from '@/assets/images/abnormal/505.svg?react'
import GradientContainer from '@/components/GradientContainer'

const ServerError = () => {
  return (
    <GradientContainer className="w-full h-full flex items-center justify-center">
      <Result
        subTitle={
          <span className="text-base text-[--dip-text-color-65]">
            {intl.get('error.serverUnavailable')}
          </span>
        }
        // extra={
        //   <Button type="primary" onClick={() => navigate('/')}>
        //     Back
        //   </Button>
        // }
        icon={<ServerErrorIcon />}
      />
    </GradientContainer>
  )
}

export default ServerError
