# references/

渐进披露的下半段。SKILL.md 是索引，这里是细节。**不要预加载。**

把 Vercel 的 `vercel-react-best-practices` 规则集放在这里：

```
references/
├── AGENTS.md            # 完整编译文档
└── rules/
    ├── async-parallel.md
    ├── bundle-barrel-imports.md
    └── ...
```

引用方式：SKILL.md 里写"详见 `references/rules/async-parallel.md`"，
让模型在需要时才读那一个文件，而不是把 70 条塞进主上下文。
