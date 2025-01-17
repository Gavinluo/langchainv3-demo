from langchain.agents import initialize_agent, Tool, AgentType
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory

# 定义 Memory
memory = ConversationBufferMemory()


# 定义一个简单的 Tool
def calculator_tool(query: str) -> str:
    try:
        return str(eval(query))
    except Exception as e:
        return f"Error: {str(e)}"


tool = Tool(
    name="Calculator",
    func=calculator_tool,
    description="Useful for performing mathematical calculations."
)

# 定义 ChatOpenAI 模型
llm = ChatOpenAI(model="gpt-3.5-turbo")

# 初始化 Agent
agent = initialize_agent(
    tools=[tool],
    llm=llm,
    memory=memory,
    agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,  # 支持对话和工具调用
    verbose=True  # 打印详细日志
)

# 执行任务
response1 = agent.run("What is 12 * 15?")

print(response1)
#
# response2 = agent.run(input="Can you remind me what I just asked?")
# print(response2)
