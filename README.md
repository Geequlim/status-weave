# Status Weave

面向 Cinnamon 水平面板的可扩展系统状态监控 applet。

## 开发

项目不使用 npm scripts，统一通过 Tiny 快捷指令执行：

```sh
yarn install
yarn tiny build
yarn tiny build/cinnamon
yarn tiny check
yarn tiny lint
yarn tiny install
yarn tiny uninstall
yarn tiny logs
```

开发脚本使用 `.mts`，单元测试使用 Vitest；项目要求 Node.js 24 以上和 Yarn 4。

`yarn tiny build` 会把 TypeScript 编译为 Cinnamon 可加载的 CommonJS，并生成 `build/spice/status-weave@geequlim/` 开发包。`yarn tiny install` 会将其安装到当前用户的 Cinnamon applet 目录，并重载正在运行的 applet 实例，确保面板使用刚构建的代码；如果重载失败，指令也会以失败状态退出。
`yarn tiny uninstall` 会移除当前用户目录下的 `status-weave@geequlim` 开发版 applet。

当前 applet 已实现共享的 CPU、内存、hwmon 温度、风扇、NVIDIA GPU 和网络异步采样，实例级右键编排、状态颜色、稳定宽度、完整工具提示，以及各指标的左键详情页。所有指标只在至少一个可见布局项使用时采集。温度和风扇支持主要值、峰值和平均值格式；NVIDIA GPU 使用一次批量查询取得利用率、温度、显存、功耗、频率及运行状态；网络支持自动主连接、所有物理接口和指定网卡，并提供紧凑的双向速率格式。开发验证时可以从右键菜单添加“状态演示（开发）”，循环检查正常、警告、危险、不可用和等待状态；它默认不会出现在面板中，也不会访问硬件。

Status Weave 明确只支持顶部和底部水平面板。Cinnamon 会阻止或提示处理放置到左右垂直面板的实例。

- [产品形态与交互原则](docs/product-shape.md)
- [执行路线图](docs/execution-plan.md)
- [产品与开发计划](status-weave-development-plan.md)
