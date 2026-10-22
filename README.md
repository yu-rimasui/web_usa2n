# web_usa2n

淡いグリーンのレトロな実験室を巡る、usa2nの3D個人サイトです。

公開サイト: https://yu-rimasui.github.io/web_usa2n/

```sh
cd site
npm ci
npm run dev
```

現在は「入口 → 自己紹介」の2場面を実装しています。
構成・検証・画像については [site/README.md](site/README.md) を参照してください。

## 公開の更新

`main` にpushすると、GitHub Actionsがテスト・ビルドを行い、`site/dist/` をGitHub Pagesへ配信します。

```sh
gh run list --workflow deploy-pages.yml --limit 1
gh run watch <表示された実行ID> --exit-status
```

配信設定の確認は `gh api repos/yu-rimasui/web_usa2n/pages --jq .html_url`。
