import { Result } from 'antd'
import intl from 'react-intl-universal'
import NotFoundIcon from '@/assets/images/abnormal/404.svg?react'
import GradientContainer from '@/components/GradientContainer'

const NotFound = () => {
  return (
    <GradientContainer className="w-full h-full flex items-center justify-center">
      <Result
        subTitle={
          <span className="text-base text-[--dip-text-color-65]">{intl.get('error.pageNotFound')}</span>
        }
        // extra={
        //   <Button type="primary" onClick={() => navigate('/')}>
        //     Back
        //   </Button>
        // }
        icon={<NotFoundIcon />}
      />
    </GradientContainer>
  )
}

export default NotFound
