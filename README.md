# Status Weave

面向 Cinnamon 面板的可扩展系统状态监控 applet，目前处于项目骨架阶段。

## 开发

项目不使用 npm scripts，统一通过 Tiny 快捷指令执行：

```sh
yarn install
yarn tiny build
yarn tiny check
yarn tiny lint
yarn tiny install
yarn tiny uninstall
```

开发脚本使用 `.mts`，单元测试使用 Vitest；项目要求 Node.js 24 以上和 Yarn 4。

`yarn tiny build` 会把 TypeScript 编译为 Cinnamon 可加载的 CommonJS，并生成 `build/spice/status-weave@geequlim/` 开发包。`yarn tiny install` 会将其安装到当前用户的 Cinnamon applet 目录。
`yarn tiny uninstall` 会移除当前用户目录下的 `status-weave@geequlim` 开发版 applet。

当前最小 applet 已具备实例编号和独立静态设置入口；遥测、Provider 与展示配置将在后续阶段实现。详细范围见 [status-weave-development-plan.md](status-weave-development-plan.md)。
