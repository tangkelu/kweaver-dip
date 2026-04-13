import aiPromptInput_en from './ai-prompt-input/en-US.json'
import aiPromptInput_zh from './ai-prompt-input/zh-CN.json'
import aiPromptInput_tw from './ai-prompt-input/zh-TW.json'
import dataAgent_en from './data-agent/en-US.json'
import dataAgent_zh from './data-agent/zh-CN.json'
import dataAgent_tw from './data-agent/zh-TW.json'
import digitalHuman_en from './digital-human/en-US.json'
import digitalHuman_zh from './digital-human/zh-CN.json'
import digitalHuman_tw from './digital-human/zh-TW.json'
import dipChatKit_en from './dip-chat-kit/en-US.json'
import dipChatKit_zh from './dip-chat-kit/zh-CN.json'
import dipChatKit_tw from './dip-chat-kit/zh-TW.json'
import error_en from './error/en-US.json'
import error_zh from './error/zh-CN.json'
import error_tw from './error/zh-TW.json'
import global_en from './global/en-US.json'
import global_zh from './global/zh-CN.json'
import global_tw from './global/zh-TW.json'
import history_en from './history/en-US.json'
import history_zh from './history/zh-CN.json'
import history_tw from './history/zh-TW.json'
import home_en from './home/en-US.json'
import home_zh from './home/zh-CN.json'
import home_tw from './home/zh-TW.json'
import initialConfiguration_en from './initial-configuration/en-US.json'
import initialConfiguration_zh from './initial-configuration/zh-CN.json'
import initialConfiguration_tw from './initial-configuration/zh-TW.json'
import login_en from './login/en-US.json'
import login_zh from './login/zh-CN.json'
import login_tw from './login/zh-TW.json'
import routes_en from './routes/en-US.json'
import routes_zh from './routes/zh-CN.json'
import routes_tw from './routes/zh-TW.json'
import sider_en from './sider/en-US.json'
import sider_zh from './sider/zh-CN.json'
import sider_tw from './sider/zh-TW.json'
import skills_en from './skills/en-US.json'
import skills_zh from './skills/zh-CN.json'
import skills_tw from './skills/zh-TW.json'
import workPlan_en from './work-plan/en-US.json'
import workPlan_zh from './work-plan/zh-CN.json'
import workPlan_tw from './work-plan/zh-TW.json'

const zh_CN = {
  ...error_zh,
  ...global_zh,
  ...history_zh,
  ...home_zh,
  ...initialConfiguration_zh,
  ...login_zh,
  ...routes_zh,
  ...aiPromptInput_zh,
  ...dataAgent_zh,
  ...digitalHuman_zh,
  ...dipChatKit_zh,
  ...sider_zh,
  ...skills_zh,
  ...workPlan_zh,
}

const zh_TW = {
  ...error_tw,
  ...global_tw,
  ...history_tw,
  ...home_tw,
  ...initialConfiguration_tw,
  ...login_tw,
  ...routes_tw,
  ...aiPromptInput_tw,
  ...dataAgent_tw,
  ...digitalHuman_tw,
  ...dipChatKit_tw,
  ...sider_tw,
  ...skills_tw,
  ...workPlan_tw,
}

const en_US = {
  ...error_en,
  ...global_en,
  ...history_en,
  ...home_en,
  ...initialConfiguration_en,
  ...login_en,
  ...routes_en,
  ...aiPromptInput_en,
  ...dataAgent_en,
  ...digitalHuman_en,
  ...dipChatKit_en,
  ...sider_en,
  ...skills_en,
  ...workPlan_en,
}

const locales = {
  'zh-CN': zh_CN,
  'zh-TW': zh_TW,
  'en-US': en_US,
}

export default locales
