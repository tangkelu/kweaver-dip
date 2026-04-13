import { Result } from 'antd'
import intl from 'react-intl-universal'
import NoAccessIcon from '@/assets/images/abnormal/403.svg?react'
import GradientContainer from '@/components/GradientContainer'

const NoAccess = () => {
  return (
    <GradientContainer className="w-full h-full flex items-center justify-center">
      <Result
        subTitle={
          <span className="text-base text-[--dip-text-color-65]">
            {intl.get('error.noAccess')}
          </span>
        }
        // extra={
        //   <Button type="primary" onClick={() => navigate('/')}>
        //     Back
        //   </Button>
        // }
        icon={<NoAccessIcon />}
      />
    </GradientContainer>
  )
}

export default NoAccess
