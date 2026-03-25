import { useCallback, useState } from 'react'
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
      <div className="flex justify-between items-end p-6 flex-shrink-0 z-20">
        <div className="flex flex-col gap-y-2">
          <span className="font-medium text-base text-[--dip-text-color]">历史记录</span>
          <span className="text-[--dip-text-color-65]">查看和管理您的所有对话记录</span>
        </div>
        <div className="flex-shrink-0">
          <SearchInput
            variant="outlined"
            className="!rounded"
            placeholder="搜索历史对话"
            onSearch={handleSearch}
          />
        </div>
      </div>
      <HistoryList
        source={{ mode: 'global' }}
        searchValue={searchValue}
        onHistoryClick={(session) => {
          navigate(`/history/${session.key}`)
        }}
      />
    </div>
  )
}

export default History
