import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Route Rescue · 无障碍行程恢复',description:'无障碍行程恢复协同系统 · 竞赛演示，使用模拟站点、设施与虚拟个人信息。',icons:{icon:'/figma/60dd8.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
