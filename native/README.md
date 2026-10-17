# 原生安装包 · Native package

`lucent-5.0.0-aira.zip` 是灵感台为鸿蒙 Aira 浏览器打包的 5.0 版自定义主页安装包，按交付时的原样保存，只改了外部文件名。包内的清单与产品文案保留当时的写法（内部名称为「名片 · Profile Card」）。

`lucent-5.0.0-aira.zip` is the 5.0 custom-homepage package built for the Aira browser on HarmonyOS. It is kept byte-for-byte as delivered; only the outer filename changed. Its internal manifest and copy keep their original wording.

SHA-256:

```text
cc1c59bd932d19ef188f6599f63fc955626a74c615e4bd800ea0d96bb58e7702
```

`npm run check` 会重新计算并核对这个摘要。导入方式：在 Aira 的「自定义主页」中选择这个 ZIP。仓库根目录是网页版，不要把整个仓库打包导入。

`npm run check` recomputes and verifies this digest. Import the ZIP through Aira's custom-homepage feature; the repository root is the web edition and is not an Aira package.
