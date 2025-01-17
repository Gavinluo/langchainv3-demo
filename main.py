import getpass
import os

from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

if not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("")

from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")
memory = ConversationBufferMemory(memory_key="history", return_messages=True)
# 创建对话链
conversation = ConversationChain(
    llm=model,
    memory=memory,
    verbose=True  # 可选，用于调试，显示内部步骤
)
msg = conversation.run("你好，我是罗江")
print(msg)
msg = conversation.run("你好，你知道我是谁吗？")
print(msg)

