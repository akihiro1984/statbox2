import storeBase from "../store/store-base";
import * as Common from './common'
const eventkey = {};
// ---------------------------------------------------------------------------------------------
export default function (val, parentDiv) {
  const prefOrCity = parentDiv.split('-')[parentDiv.split('-').length - 1 ];
  const palentDiv = d3.select(parentDiv);
  const isEStat = val.estat;
  if(palentDiv.style('display') === 'none') return;
  let dataset;
  let statName;
  let unit;
  if (isEStat) {
    const target = val.statData[val.statData.length - 1];
    dataset = target.data2;
    statName = val.statName;
    unit = target.data[0]['@unit'];
  } else {
    dataset = val.statData.data;
    statName = val.statData.title;
    unit = val.statData.unit;
  }
  // 大元のSVG領域の大きさを設定-------------------------------------------------------------
  let width = palentDiv.node().getBoundingClientRect().width;
  let height = palentDiv.node().getBoundingClientRect().height
    - palentDiv.select('.chart-div-handle').node().getBoundingClientRect().height;
  const defaultWidth = 300;
  let multi = width / defaultWidth < 1.5 ? width / defaultWidth : 1.5;
  const margin = { 'top': 60 * multi, 'bottom': 60 * multi, 'right': 60 * multi, 'left': 20 * multi };
  // データ等を作るクラス-------------------------------------------------------------------------
  class DataCreate {
    constructor (dataset) {
      this.dataset = dataset
    }
    create () {
      if (prefOrCity === 'pref') this.dataset.shift();
    }
  }
  //---------------------------------------------------------------------------------------------
  const dc = new DataCreate(JSON.parse(JSON.stringify(dataset)));
  dc.create();
  // --------------------------------------------------------------------------------------------
  const histgramCreate = (dataset, isTransition) => {
    // SVG領域作成---------------------------------------------------------------------------
    palentDiv.select('.chart-svg').remove();
    const svg = palentDiv.select('.resizers').append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'chart-svg');
    // -------------------------------------------------------------------------------------------
    const map = dataset.map( d => d.data);
    // xスケール----------------------------------------------------------------------------------
    const xScale = d3.scaleLinear()
    .rangeRound([0, width - margin.left - margin.right])
    .domain([0, d3.max(map)]);
    // ヒストグラムデータ---------------------------------------------------------------------------
    const histoData = d3.histogram()
    .domain(xScale.domain())
    .thresholds(xScale.ticks(6))(map);
    // yスケール----------------------------------------------------------------------------------
    const yScale = d3.scaleLinear()
    .domain([0, d3.max(histoData, d => d.length)])
    .range([height - margin.top - margin.bottom, 0]);
    // バー---------------------------------------------------------------------------------------
    const bar = svg.selectAll(".bar")
    .data(histoData)
    .enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", function(d) {
      return "translate(" + (xScale(d.x0) + margin.left ) + "," + margin.top + ")";
    });
// バー-----------------------------------------------------------------------------------------
    const rect = bar.append("rect")
    .attr("x", 1)
    .attr("width", xScale(histoData[0].x1) - xScale(histoData[0].x0) - 3)
    .attr('fill', 'slategray')
    .attr('y', yScale(0))
    .attr('height', 0);
    if (isTransition) {
      rect.transition()
      .duration(1500)
      .delay((d, i) => i * 3000 / map.length)
      .attr('y', d => yScale(d.length))
      .attr("height", d => height - yScale(d.length) - margin.bottom - margin.top);
    } else {
      rect.attr('y', d => yScale(d.length))
      .attr("height", d => height - yScale(d.length) - margin.bottom - margin.top);
    }
    // ツールチップ---------------------------------------------------------------------------------
    const tip = d3Tip().attr('class', 'd3-tip').html(d => d);
    svg.call(tip);
    rect
    .on('mouseover', function (d) {
      const result = dc.dataset.filter(value => value.data >= d.x0 && value.data <= d.x1);
      const citynames = result.map(value => value.cityname);
      return tip.show(citynames.join(), this)
    })
    .on('mouseout', tip.hide);
    // バーのテキスト-----------------------------------------------------------------------------
    const text = bar.append("text")
    .attr('fill', 'black')
    .attr('font-size', 10 * multi + 'px')
    .attr("text-anchor", "middle")
    .text(d => { if (d.length) return d.length + '市町村' })
    .attr("x", (xScale(histoData[0].x1) - xScale(histoData[0].x0)) / 2)
    .attr('y', d => yScale(d.length) - 5)
    .attr('opacity', 0);
    if (isTransition) {
      text.transition()
      .duration(4000)
      .attr('opacity', 1);
    } else {
      text.attr('opacity', 1);
    }
    // x軸描画---------------------------------------------------------------------------------
    const kankaku = histoData[0].x1 - histoData[0].x0;
    const tick = histoData.map((d, i) => kankaku * (i + 1) - kankaku / 2);
    const xAxis = d3.axisBottom(xScale)
    .tickValues(tick);
    svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + (height - margin.bottom) + ")")
    .call(xAxis)
    .selectAll('text')
    .attr('font-size', 10 * multi + 'px')
    .attr('transform', 'rotate(45)')
    .attr('text-anchor', 'start');
    // 単位------------------------------------------------------------------------------------
    svg.append('g')
    .attr('transform', 'translate(' + (width - 20) + ',' + (height - margin.bottom + 35) + ')')
    .append('text')
    .text('単位:' + unit)
    .attr('text-anchor', 'end')
    .attr('font-size', 10 * multi + 'px');
    // 表名-------------------------------------------------------------------------------------
    svg.append('g')
    .attr('font-size', 12 * multi + 'px')
    .attr('transform', () => 'translate(5,' + (12 * multi + 5) + ')')
    .attr('class', 'no-print')
    .append('text')
    .text(statName);
  };
  histgramCreate(dc.dataset, true);
  // --------------------------------------------------------------------------------------------
  const redraw = () => {
    multi = width / defaultWidth < 1.5 ? width / defaultWidth : 1.5;
    let target;
    if (isEStat) {
      const value = Number(d3.select('#year-range-' + prefOrCity).select('.year-range').property("value"));
      target = val.statData[value].data2;
    } else {
      target = dataset
    }
    const dc = new DataCreate(JSON.parse(JSON.stringify(target)));
    dc.create();
    histgramCreate(dc.dataset, false)
  };
  // リサイズ検知--------------------------------------------------------------------------------
  const isFirst = {miyazaki: true, pref: true, city: true};
  const resizeObserver = new ResizeObserver(entries => {
    if (!isFirst[prefOrCity]) { // 最初(統計を選択した時) は動作させない。
      if (!storeBase.state.base.menuChange) { // メニュー移動時も動作させない。
        for (const entry of entries) {
          width = entry.contentRect.width;
          height = entry.contentRect.height - palentDiv.select('.chart-div-handle').node().getBoundingClientRect().height;
          redraw()
        }
      }
    }
    isFirst[prefOrCity] = false
  });
  const target = palentDiv.node();
  resizeObserver.observe(target);
  //--------------------------------------------------------------------------------------------
  if (isEStat) {
    const type = ie ? 'change' : 'input';
    Common.eventAddRemove.removeListener(eventkey[prefOrCity]);
    eventkey[prefOrCity] = Common.eventAddRemove.addListener(document.querySelector('#year-range-' + prefOrCity + ' .year-range'), type, (() => {
      return () => redraw()
    })(1), false);
  }
}
