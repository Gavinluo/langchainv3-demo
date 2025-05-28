import { Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import Prism from 'prismjs';  // 假设使用 Prism.js 进行高亮
import 'prismjs/components/prism-iecst'; // 加载Structured Text高亮
import 'prismjs/themes/prism-okaidia.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import ReactMarkdown from 'react-markdown';

const MarkdownRender = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown 
      // 自定义渲染器
      components={{
        code({ inline, className, children, ...props }: any) {          
          const codeText = String(children).replace(/\n$/, '');  // 代码字符串
          const language = 'iecst';  // 提取语言名

          if (inline) {
            // 行内代码直接渲染
            return <code {...props}>{children}</code>;
          }

          // 非行内（即代码块）渲染
          // 对代码进行高亮处理
          const html = language 
            ? Prism.highlight(codeText, Prism.languages[language], language) 
            : codeText;
          return (
            <div style={{ marginBottom: 16 }}>
              {/* 按钮单独一行 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <Button 
                  icon={<CopyOutlined />} 
                  size="small" 
                  type="text"
                  onClick={() => navigator.clipboard.writeText(codeText)}
                >
                  复制
                </Button>
              </div>
              {/* 代码块 */}
              <pre
                className={`line-numbers language-${language}`}
                {...props}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRender;
