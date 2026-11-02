# 验收记录

本文件沿用正式报告中的 R01～R12 与 Q01～Q13。功能及项目约定以 [正式设计](./README.md) 和课程原文为依据。

## 执行基线

- 2026-11-02 开始实现，原始 HEAD 为 `321cf83`。
- 已有审核文档作为第一阶段设计基线纳入提交。
- 检查时 Node.js 为 v24.22.0，npm 为 11.19.1。
- 远程与最终标签状态将在发布时实际检查。

## 原始开发阶段记录

| 阶段 | 内容 | 结果 |
| --- | --- | --- |
| 1 | 设计核对、TypeScript 严格配置、工具链 | typecheck 与 build 通过，远程 main 核实为初始提交，final 尚不存在 |
| 2 | 领域模型与树结构 | typecheck 通过，10 项领域测试通过，包含深拷贝恢复与溢出不修改属性 |
| 3 | Command 与历史 | typecheck 与 24 项测试通过，十类命令完整撤销重做、部分执行异常回滚及历史屏障已验证 |
| 4 | SVG 与存储 | 19 项 SVG 测试通过，包含实际 Windows 覆盖保存、失败保留、保序导入、转义与两遍补 ID |
| 5 | CLI 与实际回放 | typecheck 与 65 项测试通过，三组真实 CLI 进程回放通过，检查 SVG 结构与关键属性 |
| 6 | 完整验收、渲染、文档和交付 | npm ci、verify 通过，67/67 测试，真实渲染与源码自查完成，最终发布按下文核验 |

## 实际发现与修复

- XML 库的 image/svg+xml 模式会为缺少 xmlns 的输入补默认 SVG namespace。改用 application/xml 解析并显式核对 namespace，非法根测试现已通过。
- 受限执行环境拒绝 rename 覆盖已有文件。正常 Windows 权限下运行相同用例通过，保持原子替换实现，保留原文件与会话的失败路径也已通过。
- 最初 SSH 推送被只读 deploy key 拒绝。随后发现现有 origin 已切换为 HTTPS，首次 HTTPS 推送遭连接重置。以单次 `http.sslBackend=schannel` 选项正常推送前五阶段成功，未修改全局配置。
- AI 自查发现顶层 xml-stylesheet 指令可能被忽略，现明确拒绝。DOCTYPE 按 XML 解析结果判断，CDATA 中的普通文本可往返。

## 功能与证据映射

| 验收组 | 主要实现 | 可复现依据 | 结果 |
| --- | --- | --- | --- |
| Q01 | src 各模块 | `npm run typecheck`、`npm run build`、[架构检查脚本](../scripts/check-architecture.ts) | 通过 |
| Q02、Q03 | [分词器](../src/cli/CommandTokenizer.ts)、[分发器](../src/cli/CommandDispatcher.ts)、[工厂](../src/domain/ShapeFactory.ts) | [CLI 测试](../tests/cli.test.ts)，含全 19 命令单会话 | 通过 |
| Q04 | [Shape](../src/domain/Shape.ts)、[NumericShape](../src/domain/NumericShape.ts)、[GroupShape](../src/domain/GroupShape.ts) | [领域测试](../tests/domain.test.ts)、[像素测试](../tests/render.test.ts) | 通过 |
| Q05 | [SvgDocument](../src/domain/SvgDocument.ts) | 领域及应用测试的树顺序、成环、解组、删除和恢复断言 | 通过 |
| Q06、Q07 | [Command](../src/application/Command.ts)、[HistoryManager](../src/application/HistoryManager.ts)、[EditorService](../src/application/EditorService.ts) | [应用测试](../tests/application.test.ts)，十类编辑分别执行、撤销、重做 | 通过 |
| Q08 | [解析器](../src/infrastructure/SvgParser.ts)、[序列化器](../src/infrastructure/SvgSerializer.ts)、[存储](../src/infrastructure/FileDocumentStore.ts) | [SVG 测试](../tests/svg.test.ts)，实际文件替换及失败保留 | 通过 |
| Q09 | application/queries、CLI | CLI 测试与典型会话输出，help 列出 19 命令 | 通过 |
| Q10 | SVG 序列化和 resvg | [像素测试](../tests/render.test.ts)、[流程图](../examples/flowchart.png)、[移动后预览](../examples/flowchart-moved.png) | 通过，浏览器 GUI 未操作 |
| Q11 | [会话脚本](../examples/typical.commands)、[版本 A](../examples/flowchart.commands) | CLI 子进程测试与 doc/evidence 输出 | 通过 |
| Q12 | [实验报告](./README.md)、架构图 | 静态依赖检查、链接检查、实际目录核对 | 通过 |
| Q13 | Git 分阶段提交和发布 | 推送前检查同名标签，发布后实时核对远程 main 与 final 解引用提交 | 发布结果在最终回复报告，截止时间未提供 |

R01～R12 到 Q01～Q13 的对应表见实验报告第一节。完整执行日志为 [verification.txt](./evidence/verification.txt)。日志中总计 67 项测试，全部通过，0 失败、0 跳过、0 待办。

## 使用入口与产物

- `npm ci` 重新按锁文件安装成功。
- `npm run verify` 顺序完成类型检查、编译、架构检查和测试。
- `npm run examples` 通过四个真实 CLI 会话，预期错误数量分别为 2、0、4、0。
- `npm run render -- examples/flowchart.svg examples/flowchart.png` 实际生成 800×600 PNG。
- `npm run render -- examples/flowchart-moved.svg examples/flowchart-moved.png` 验证节点容器移动后的矩形与中文文字一起下移，连接线保持其独立几何位置。
- 架构图生成 1000×660 PNG 并实际查看，7 条依赖与代码一致。
- 像素测试验证 front/back 的真实绘制结果、容器 fill 继承和整组平移。

## 发布前检查

先以通过全部核心验收的提交作为交付基准，再创建 final。检查本地与远程同名标签，保持既有标签安全。发布后核对远程 main、final 和解引用提交，最终回复记录 commit 与结果，保持标签所指内容稳定。

课程截止时间未提供，无法判断提交时间是否在截止前。transform、CSS、字体排版与其他高级 SVG 特性按报告声明的边界拒绝，未纳入核心子集通过范围。

## 本次功能历史整理

已完成的六次阶段变更按依赖事后细化为 29 个非空提交。使用本次实际创建时间，逐节点检查类型、构建与已有测试，保留原始历史归档。该整理单独记录，原始开发阶段仍见上表。

详细清单见 [功能提交与整理记录](./development-history.md)，逐节点结果见 [整理验证数据](./evidence/history-split-validation.json)。
