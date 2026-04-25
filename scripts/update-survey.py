#!/usr/bin/env python3
"""
更新問卷分析頁面資料的腳本

使用方法：
  1. 從 Google Sheets 匯出 CSV（檔案 → 網頁發布 → 發布為網頁 → 取得 CSV 連結）
  2. 將 CSV 內容貼到下面的 RAW_CSV 變數，或修改 SHEET_URL 變數用 curl 直接下載
  3. 執行：python3 scripts/update-survey.py

此腳本會：
  - 解析 CSV 資料
  - 自動產生 SURVEY_DATA JS 陣列
  - 替換 docs/survey-analysis.html 中的 SURVEY_DATA 區塊
"""

import csv, re, sys, os
from io import StringIO

# ════════════════════════════════════════════════════════════
#  請在這裡貼上 Google Sheets 匯出的 CSV 內容
#  （從 Google Sheets → 檔案 → 向下載為 → CSV）
# ════════════════════════════════════════════════════════════
RAW_CSV = """時間戳記,姓名,帶您來的朋友,Q1產品感受,Q2課程理解,Q3教學方式,Q4實作體驗,Q5感興趣產品,Q6想改善問題,Q7感興趣課程,Q7b再次參加,Q8事業機會,Q9印象深刻,Q10留言,新朋友
2026/4/25 下午3:57:31,卉羚,卉羚,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露,暗沉,進階肌膚保養、彩妝技巧、AI工具應用、健康養生講座,願意，覺得很值得,很有興趣，想進一步了解,,,
2026/4/25 下午3:57:41,柏均,碧桃,還不錯，想再試試,非常了解，收穫很多！,非常清楚好懂,非常有感！,火山泥面膜,出油不穩,進階肌膚保養,願意，覺得很值得,很有興趣，想進一步了解,,,v
2026/4/25 下午3:57:55,糖果,糖果,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,火山泥面膜、NAD青春霜,粉刺痘痘,進階肌膚保養、AI工具應用,願意，覺得很值得,很有興趣，想進一步了解,實作分享，超有意思,場地可以再適當調整一下，脫鞋子不太好😅,
2026/4/25 下午3:58:13,高幸憶,白繐綺,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、潔膚乳、火山泥面膜、NAD青春霜,暗沉,進階肌膚保養、AI工具應用,願意，覺得很值得,很有興趣，想進一步了解,,,
2026/4/25 下午3:58:18,鍾淑惠,Candy,還不錯，想再試試,非常了解，收穫很多！,非常清楚好懂,非常有感！,火山泥面膜,敏感泛紅,AI工具應用,視主題與價格而定,很有興趣，想進一步了解,,,v
2026/4/25 下午3:58:28,虞秀紅,未來的貴人,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,其他：防曬,其他：去斑,彩妝技巧、健康養生講座,願意，覺得很值得,很有興趣，想進一步了解,很溫暖的氣氛,多多舉辦,
2026/4/25 下午3:58:38,蘇琬玲,董華正,還不錯，想再試試,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、火山泥面膜、NAD青春霜,乾燥缺水、敏感泛紅,AI工具應用,視主題與價格而定,目前暫不考慮,,,v
2026/4/25 下午3:58:44,曹婷玉,曹婷玉,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、潔膚乳、火山泥面膜、NAD青春霜、小黑卸妝棉,出油不穩、暗沉,進階肌膚保養、彩妝技巧、AI工具應用、健康養生講座,願意，覺得很值得,很有興趣，想進一步了解,,,
2026/4/25 下午3:58:47,廖櫻庭,黃小圓,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,火山泥面膜、NAD青春霜,乾燥缺水、出油不穩、粉刺痘痘、暗沉、敏感泛紅,進階肌膚保養、彩妝技巧,願意，覺得很值得,很有興趣，想進一步了解,實作火山泥,超讚,
2026/4/25 下午3:59:07,睿禎,娜坦莉,還不錯，想再試試,有幫助，有新的認識,還不錯,有幫助,其他：化妝水,暗沉,其他,視主題與價格而定,目前暫不考慮,卸妝的重要性,,v
2026/4/25 下午3:59:18,喵,喵喵,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、火山泥面膜、NAD青春霜,出油不穩,進階肌膚保養,願意，覺得很值得,很有興趣，想進一步了解,,,
2026/4/25 下午3:59:34,劉來好,葉柔君,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、潔膚乳、火山泥面膜、NAD青春霜,出油不穩、粉刺痘痘、暗沉,彩妝技巧,願意，覺得很值得,目前暫不考慮,火山泥,,v
2026/4/25 下午3:59:37,Terry,廖紋君,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,火山泥面膜,暗沉、其他：拉提,進階肌膚保養、彩妝技巧、AI工具應用、健康養生講座,願意，覺得很值得,很有興趣，想進一步了解,火山泥體驗、生活開銷可以賺錢回來的部份,很好玩,
2026/4/25 下午4:00:06,佩庭,白繐綺,還不錯，想再試試,非常了解，收穫很多！,非常清楚好懂,非常有感！,火山泥面膜、小黑卸妝棉,乾燥缺水、出油不穩、粉刺痘痘、敏感泛紅,進階肌膚保養、彩妝技巧,視主題與價格而定,有點好奇，可以多聽聽,,,v
2026/4/25 下午4:03:15,黃淑美,白繐綺,還不錯，想再試試,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、火山泥面膜、NAD青春霜,出油不穩、敏感泛紅,進階肌膚保養、健康養生講座,視主題與價格而定,有點好奇，可以多聽聽,講師分享的內容很棒,,v
2026/4/25 下午5:00:39,董華正,董老師,超喜歡，想買！,非常了解，收穫很多！,非常清楚好懂,非常有感！,保濕露、潔膚乳、火山泥面膜、NAD青春霜、小黑卸妝棉、其他：平泰秀,敏感泛紅,進階肌膚保養,願意，覺得很值得,很有興趣，想進一步了解,主持人很專業,電腦手很帥,"""

# ════════════════════════════════════════════════════════════
#  主程式
# ════════════════════════════════════════════════════════════

def escape_js_str(s):
    """Escape a string for use inside a JavaScript string literal."""
    return (s or '').replace('\\', '\\\\').replace('"', '\\"').replace("'", "\\'").replace('\n', '\\n').replace('\r', '')

def csv_to_js_array(csv_text):
    reader = csv.DictReader(StringIO(csv_text.strip()))
    rows = list(reader)

    lines = []
    for r in rows:
        parts = []
        for k in r.keys():
            parts.append(f'"{k}":"{escape_js_str(r[k])}"')
        lines.append('  {' + ','.join(parts) + '}')
    return '[\n' + ',\n'.join(lines) + '\n]'

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(script_dir, '..', 'docs', 'survey-analysis.html')

    print(f"📊 解析 CSV 資料...")
    reader = csv.DictReader(StringIO(RAW_CSV.strip()))
    rows = list(reader)
    all_rows = rows
    nf = [r for r in rows if (r.get('新朋友') or '').strip() == 'v']
    pt = [r for r in rows if (r.get('新朋友') or '').strip() != 'v']

    print(f"   總人數：{len(all_rows)}")
    print(f"   🌸 新朋友（O欄=v）：{len(nf)} → {[r['姓名'] for r in nf]}")
    print(f"   🤝 夥伴：{len(pt)}")

    print(f"\n🔧 產生 JS 陣列...")
    js_array = csv_to_js_array(RAW_CSV)

    print(f"📝 讀取 HTML 檔案...")
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace SURVEY_DATA
    pattern = r'(const SURVEY_DATA = )\[.*?\];'
    if re.search(pattern, html, re.DOTALL):
        new_html = re.sub(pattern, r'\1' + js_array + ';', html, flags=re.DOTALL)
        print(f"✅ 已替換 SURVEY_DATA 區塊")
    else:
        print(f"⚠️ 找不到 SURVEY_DATA 區塊，請確認 HTML 格式是否正確")
        return

    # Also update the last-updated text
    from datetime import datetime
    date_str = datetime.now().strftime('%Y/%m/%d')
    html = new_html
    new_html = re.sub(
        r"document\.getElementById\('last-updated'\)\.textContent = [^;]+;",
        f"document.getElementById('last-updated').textContent = '📅 更新：{date_str}（共{len(all_rows)}人）';",
        html
    )
    new_html = re.sub(
        r"document\.getElementById\('update-info'\)\.textContent = [^;]+;",
        f"document.getElementById('update-info').textContent = '💡 如欲更新資料，請修改 HTML 檔案中的 SURVEY_DATA 陣列內容，或執行 scripts/update-survey.py';",
        new_html
    )

    print(f"💾 寫入 HTML 檔案...")
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_html)

    print(f"\n✅ 完成！docs/survey-analysis.html 已更新")
    print(f"   📅 更新日期：{date_str}")
    print(f"   👥 總填答：{len(all_rows)} 人")
    print(f"   🌸 新朋友：{len(nf)} 人")
    print(f"   🤝 夥伴：{len(pt)} 人")

if __name__ == '__main__':
    main()
