# 功能提交与历史整理记录

本文件记录对已完成实现进行的事后功能拆分。原始实现形成六次阶段提交，本次依用户要求细化为 29 个可检查、非空的提交。各提交采用整理时的实际时间，展示功能依赖和代码接入顺序。原始记录另外归档，供区分开发过程与整理过程。

## 功能提交清单

| 序号 | 提交 | 功能 | 本次节点验证 |
| --- | --- | --- | --- |
| 1 | 027ca39 | chore: 初始化 TypeScript 工程与构建配置 | 类型检查、构建通过；该节点尚无测试 |
| 2 | c42d0c9 | docs: 明确模块职责、依赖方向和验收清单 | 类型检查、构建通过；该节点尚无测试 |
| 3 | 0522c26 | feat: 定义图形抽象、数值约束与组合容器 | 类型检查、构建通过；该节点尚无测试 |
| 4 | 9952fce | feat: 实现矩形属性、平移与缩放 | 类型检查、构建通过；该节点尚无测试 |
| 5 | 8ec7062 | feat: 支持圆形与椭圆的几何操作 | 类型检查、构建通过；该节点尚无测试 |
| 6 | 21bc665 | feat: 支持线段与中文文本图形 | 类型检查、构建通过；该节点尚无测试 |
| 7 | 48fc8b8 | feat: 集中创建六类图形并校验类型参数 | 类型检查、构建通过；该节点尚无测试 |
| 8 | a3d9d0c | feat: 管理画布、唯一 ID 和图形层级顺序 | 类型检查、构建通过；该节点尚无测试 |
| 9 | f576227 | test: 验证图形变换、树操作和文档快照 | 类型检查、构建通过；10 项通过 |
| 10 | c34977a | feat: 展示图形结构树与属性明细 | 类型检查、构建通过；10 项通过 |
| 11 | d4b8f58 | feat: 建立命令事务和撤销重做历史 | 类型检查、构建通过；10 项通过 |
| 12 | 29cf740 | feat: 支持图形创建与子树删除命令 | 类型检查、构建通过；10 项通过 |
| 13 | e72cd1b | feat: 支持移动、缩放与属性修改命令 | 类型检查、构建通过；10 项通过 |
| 14 | 0690281 | feat: 支持分组、解组和移动图形归属 | 类型检查、构建通过；10 项通过 |
| 15 | 7d1bdc3 | feat: 支持图形置顶和置底 | 类型检查、构建通过；10 项通过 |
| 16 | cc59f19 | feat: 协调编辑会话、文件端口和历史屏障 | 类型检查、构建通过；24 项通过 |
| 17 | 921f2f8 | feat: 将图形树序列化为合法 SVG | 类型检查、构建通过；24 项通过 |
| 18 | 3ba90c0 | feat: 解析嵌套 SVG 并自动补全缺失 ID | 类型检查、构建通过；24 项通过 |
| 19 | c2e041f | feat: 实现文件读取和原子覆盖保存 | 类型检查、构建通过；43 项通过 |
| 20 | 47a9c85 | feat: 解析引号、颜色、注释和 Windows 路径 | 类型检查、构建通过；43 项通过 |
| 21 | 7b19a68 | feat: 分发十九种命令并解析容器归属 | 类型检查、构建通过；43 项通过 |
| 22 | 7bbb2cd | feat: 接通逐行交互并回放课程典型会话 | 类型检查、构建通过；65 项通过 |
| 23 | 2aa6336 | test: 检查模块依赖与类文件命名约束 | 类型检查、构建通过；65 项通过 |
| 24 | 0d4c528 | fix: 严格校验 SVG 命名空间、样式指令和数值 | 类型检查、构建通过；65 项通过 |
| 25 | bb6862e | test: 渲染 SVG 并验证遮挡顺序与容器平移 | 类型检查、构建通过；66 项通过 |
| 26 | e5dc0f0 | test: 覆盖全部命令入口与图形属性白名单 | 类型检查、构建通过；67 项通过 |
| 27 | e9711e6 | feat: 提供可回放示例、SVG 产物与图像预览 | 类型检查、构建通过；67 项通过 |
| 28 | 9824c75 | chore: 统一源码排版和文本换行规则 | 类型检查、构建通过；67 项通过 |
| 29 | 本报告所在提交 | docs: 完善实验报告并记录功能历史整理依据 | 类型检查、构建通过；67 项通过 |

最后一个提交以“本报告所在提交”表示，避免在提交内容中循环写入自身编号。代码最初接入前以可编译工程、抽象模型等作为节点；对应测试加入后，从该节点起执行全部已有测试。

逐节点结果见 [验证数据](./evidence/history-split-validation.json)。检查日志记录本次实际运行结果，最终功能验收仍为 67/67。

## 原始开发记录与归档

原始六次阶段提交如下。

```text
ec9e8c2 chore: establish reviewed architecture and TypeScript toolchain
b833f01 feat: implement polymorphic shapes and validated document trees
c6d3ff5 feat: add transactional commands and undo redo history
747c58b feat: support ordered SVG round trips and atomic file storage
4702c1a feat: deliver CLI parsing and course transcript replays
0133fa4 test: harden SVG import and complete reproducible course acceptance
```

完整原始历史保存在 [Git bundle 归档](./evidence/original-development.bundle)，包含初始提交、六次原始提交及其真实元数据。可在工程根目录运行以下只读命令核验。

```text
git bundle verify doc/evidence/original-development.bundle
git bundle list-heads doc/evidence/original-development.bundle
```

如需独立查看原始历史，可克隆该归档到新的目录，原始分支名为 original-development-archive。该操作创建一个独立副本。

## 完整性与发布

整理前交付提交为 `6162ef0`，原始开发末尾提交为 `0133fa4`。逐节点保留真实来源，最终 src、tests、scripts、依赖锁文件和示例内容与整理前一致。报告及新增的整理证据如实说明本次操作。

原始初始提交 321cf83 保留在新链起点。main、final 在通过检查后同步更新，旧 main 与旧 final 另有本地备份。课程截止时间未提供，无法据此判断是否满足截止要求。
