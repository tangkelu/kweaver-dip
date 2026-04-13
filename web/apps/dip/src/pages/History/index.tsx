import { useCallback, useState } from 'react'
import intl from 'react-intl-universal'
import { useNavigate } from 'react-router-dom'
import HistoryList from '@/components/HistoryList'
import SearchInput from '@/components/SearchInput'

const History = () => {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  return (
    <div className="h-full flex flex-col bg-[--dip-white] overflow-hidden relative">
      <div className="flex justify-between items-center mt-6 mb-4 flex-shrink-0 z-20 max-w-[880px] w-full mx-auto">
        <span className="font-bold text-lg text-[--dip-text-color]">{intl.get('history.common.all')}</span>
        <div className="flex-shrink-0">
          <SearchInput placeholder={intl.get('history.common.searchPlaceholder')} onSearch={handleSearch} />
        </div>
      </div>
      <HistoryList
        source={{ mode: 'global' }}
        searchValue={searchValue}
        onHistoryClick={(session) => {
          navigate(`/studio/history/${session.key}`)
        }}
      />
    </div>
  )
}

export default History
