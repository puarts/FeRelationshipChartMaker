const g_nodeSize = 100;

function countNewlines(inputString) {
    const regex = /\r?\n/g; // 改行文字にマッチする正規表現
    const matches = inputString.match(regex);
    return matches ? matches.length : 0;
}

/**
 * @param  {GraphEdge} d
 */
function getEdgeLabelPositionX(d) {
    if (d == null || d.sourceNode == null || d.destinationNode == null) return 0;
    return (d.sourceNode.x + d.destinationNode.x) / 2 + d.labelOffsetX;
}

/**
 * @param  {GraphEdge} d
 */
function getEdgeLabelPositionY(d, fontSize) {
    if (d == null || d.sourceNode == null || d.destinationNode == null) return 0;
    const lineBreakCount = countNewlines(d.label);
    return (d.sourceNode.y + d.destinationNode.y) / 2 + d.labelOffsetY - fontSize - (lineBreakCount * fontSize) / 2;
}

function getClusterLabelPositionX(d) {
    return d.x + (d.width + d.paddingLeft + d.paddingRight) / 2;
}

function getClusterLabelPositionY(d, fontSize) {
    const lineBreakCount = countNewlines(d.label);
    return d.y + d.height - d.paddingBottom + fontSize / 2;
}

function getNodeLabelPositionY(d, radius) {
    return d.hasImage ? d.y + radius - 5 : d.y + 5;
}
/**
 * @param  {GraphEdge} d
 * @param  {Number} fontSize
 */
function getEdgeLabel(d, fontSize) {
    // 改行に対応
    let result = "";
    const x = getEdgeLabelPositionX(d);
    for (const line of d.label.split(/\r?\n/)) {
        result += `<tspan x='${x}' dy='${fontSize}px'>${line}</tspan>`;
    }
    return result;
}
/**
 * @param  {GraphCluster} d
 * @param  {Number} fontSize
 */
function getClusterLabel(d, fontSize) {
    // 改行に対応
    let result = "";
    const x = getClusterLabelPositionX(d);
    for (const line of d.label.split(/\r?\n/)) {
        result += `<tspan x='${x}' dy='${fontSize}px'>${line}</tspan>`;
    }
    return result;
}

/**
 * @param  {GraphComment} d
 * @param  {Number} fontSize
 */
function getCommentText(d, fontSize) {
    // 改行に対応
    let result = "";
    const x = d.x;
    for (const line of d.text.split(/\r?\n/)) {
        result += `<tspan x='${x}' dy='${fontSize}px'>${line}</tspan>`;
    }
    return result;
}


class SvgManager {
    constructor() {
        this.svg = null;

        this.viewBoxMinX = 0;
        this.viewBoxMinY = 0;
        this.viewBoxWidth = 0;
        this.viewBoxHeight = 0;
        this.viewBoxScale = 1;
    }

    calcPhysicalToVirtualViewBoxScale() {
        return (this.viewBoxWidth / this.svg.node().clientWidth) * this.viewBoxScale;
    }
    calcVirtualToPhysicalViewBoxScale() {
        return (this.svg.node().clientWidth / this.viewBoxWidth) / this.viewBoxScale;
    }

    setViewBoxSize(width, height) {
        this.viewBoxWidth = width;
        this.viewBoxHeight = height;
    }
    setViewBoxScale(scale) {
        this.viewBoxScale = 1 / scale;
    }
    setViewBoxOffset(x, y) {
        this.viewBoxMinX = x;
        this.viewBoxMinY = y;
    }
    updateViewBoxScale(scale) {
        this.setViewBoxScale(scale);
        this.updateViewBox();
    }
    addViewBoxOffset(deltaX, deltaY) {
        this.viewBoxMinX += deltaX;
        this.viewBoxMinY += deltaY;
        this.updateViewBox();
    }

    updateViewBox() {
        this.svg
            .attr("viewBox",
                `${this.viewBoxMinX * this.viewBoxScale} ${this.viewBoxMinY * this.viewBoxScale} ${this.viewBoxWidth * this.viewBoxScale} ${this.viewBoxHeight * this.viewBoxScale}`)

    }
}

function createOrUpdateGroupedSvgElems(svg, newDataSet, groupId, elemName, keyFunc = null) {
    let group = svg.select(`#${groupId}`);
    if (group.empty()) {
        group = svg.append("g").attr("id", groupId);
    }
    return createOrUpdateSvgElems(group, newDataSet, elemName, keyFunc == null ? x => x.id : keyFunc);
}

function createOrUpdateSvgElems(parentElem, newDataSet, elemName, keyFunc = null) {
    const elems = parentElem
        .selectAll(elemName)
        .data(newDataSet, keyFunc); // key関数としてd.idを使用する
    elems.exit().remove();
    const newElems = elems
        .enter()
        .append(elemName);
    return newElems;
}

function getTextShadowStyle(shadowColor, shadowSize) {
    return `${shadowColor} ${shadowSize}px ${shadowSize}px 0px, ${shadowColor} -${shadowSize}px ${shadowSize}px 0px, ${shadowColor} ${shadowSize}px -${shadowSize}px 0px, ${shadowColor} -${shadowSize}px -${shadowSize}px 0px, ${shadowColor} 0px ${shadowSize}px 0px, ${shadowColor} 0px -${shadowSize}px 0px, ${shadowColor} -${shadowSize}px 0px 0px, ${shadowColor} ${shadowSize}px 0px 0px`;
}

class PreviewLink {
    constructor() {
        this.sourceX = 0;
        this.sourceY = 0;
        this.targetX = 0;
        this.targetY = 0;
    }
}

const g_previewLinkData = new PreviewLink();

/**
 * @param  {AppData} self
 * @param  {string} graphElementId
 * @param  {Graph} graph
 */
function updateGraphByD3js(
    self, graphElementId, graph, canvasWidth, canvasHeight
) {
    const imageFrameInnerWidth = 5;
    const imageFrameOuterWidth = 2;
    const imageFrameColor = "#ffdd99";
    const imageFrameOuterColor = "#ffaa00";
    const fontSize = 13;
    const labelOffsetX = 0;
    const labelOffsetY = fontSize * 0.3;


    const viewBoxWidth = canvasWidth;
    const viewBoxHeight = canvasHeight;
    const imageGroupId = "images";
    let svg = self.svgManager.svg;
    if (svg == null) {
        svg = d3.create("svg")
            // .attr("width", canvasWidth)
            // .attr("height", canvasHeight)
            .attr("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
            .attr("position", "absolute")
            .attr("left", 0)
            .attr("top", 0)
            ;
        const chart = svg.node();
        const area = document.getElementById(`${graphElementId}`);
        area.appendChild(chart);

        self.svgManager.svg = svg;

        const svgElem = svg.node();
        svgElem.addEventListener("wheel", (e) => {
            e.preventDefault(); // ページのスクロールを防ぐ

            // マウスホイールのdelta値から新しいスケールを計算
            const delta = e.deltaY;
            self.graphScale *= delta > 0 ? 0.9 : 1.1;
            self.svgManager.updateViewBoxScale(self.graphScale);

            // todo: スケールの原点をマウス座標の位置にしたい
            const mouseX = e.clientX;
            const mouseY = e.clientY;

        });

        // マウス中ボタンのドラッグでビューの移動
        {
            let isMiddleButtonDown = false;
            svgElem.addEventListener("mousedown", (e) => {
                if (e.button === 1) { // 1は中ボタンを表します
                    e.preventDefault();
                    isMiddleButtonDown = true;
                }
            });

            document.addEventListener("mousemove", (e) => {
                if (isMiddleButtonDown) {
                    // 画面の移動をストップ
                    e.preventDefault();
                    // 中ボタンがドラッグされた場合の処理

                    // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
                    const sizeInvScale = viewBoxWidth / self.svgManager.svg.node().clientWidth;
                    const deltaX = e.movementX * sizeInvScale;
                    const deltaY = e.movementY * sizeInvScale;
                    if (deltaX == NaN || deltaY == NaN) {
                        return;
                    }
                    self.svgManager.addViewBoxOffset(-deltaX, -deltaY);
                }
            });

            document.addEventListener("mouseup", (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    isMiddleButtonDown = false;
                }
            });
        }

        self.svgManager.setViewBoxSize(viewBoxWidth, viewBoxHeight);


        svg.on("dblclick", (e, d) => {
            // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
            const sizeScale = self.svgManager.calcPhysicalToVirtualViewBoxScale();
            // const sizeScale = (self.svgManager.svg.node().clientWidth / self.svgManager.viewBoxWidth);// / self.svgManager.viewBoxScale;

            // クリック時にノード追加
            const mouseX = e.offsetX;
            const mouseY = e.offsetY;
            console.log(`click (${mouseX}, ${mouseY})`);
            console.log(e);
            const px = mouseX * sizeScale + Number(self.svgManager.viewBoxMinX) * Number(self.svgManager.viewBoxScale);
            const py = mouseY * sizeScale + Number(self.svgManager.viewBoxMinY) * Number(self.svgManager.viewBoxScale);
            if (px == NaN || py == NaN) {
                return;
            }

            if (e.ctrlKey) {
                const comment = new GraphComment("コメント");
                comment.setPos(px, py);
                self.addComment(comment);
                self.selectSingleComment(comment);
            }
            else {
                const nodeId = AppData.estimateNodeId(self.graph);
                const defaultCharIdAndName = self.titleToCharOptions[self.currentTitle][1];
                const node = new GraphNode(nodeId, defaultCharIdAndName.id);
                node.setPos(px, py);
                self.addNode(node);
                self.selectSingleNode(node);
            }

            self.__executeAllCommands();
            self.updateGraph(graphElementId);
        });

        svg.call(d3.drag()
            .on("start", (e, d) => {
            })
            .on("drag", (e, d) => {
            })
            .on("end", (e, d) => {
                // // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
                // const sizeScale = self.svgManager.calcPhysicalToVirtualViewBoxScale();
                // // const sizeScale = (self.svgManager.svg.node().clientWidth / self.svgManager.viewBoxWidth);// / self.svgManager.viewBoxScale;

                // // クリック時にノード追加
                // console.log(`click (${e.x}, ${e.y})`);
                // const nodeId = AppData.estimateNodeId(self.graph);
                // const defaultCharIdAndName = self.titleToCharOptions[self.currentTitle][1];
                // const node = new GraphNode(nodeId, defaultCharIdAndName.id);

                // const clientWidth = self.svgManager.svg.node().clientWidth;
                // const px = e.x * sizeScale + Number(self.svgManager.viewBoxMinX) * Number(self.svgManager.viewBoxScale);
                // const py = e.y * sizeScale + Number(self.svgManager.viewBoxMinY) * Number(self.svgManager.viewBoxScale);

                // if (px == NaN || py == NaN) {
                //     return;
                // }

                // node.setPos(px, py);
                // self.addNode(node);
                // self.selectSingleNode(node);
                // self.updateGraph(graphElementId);
                self.clearSelection();

            }));

        // ノードの位置が原点にある場合だけ自動的にレイアウトを決めます。
        {
            let i = 0;
            for (const node of graph.nodes) {
                if (node.x == 0 && node.y == 0) {
                    node.x = g_nodeSize * i * 2 + g_nodeSize;
                    node.y = g_nodeSize;
                    ++i;
                }
            }
        }
    }

    const edgeLabelShadowSize = 1;
    const edgeLabelShadowColor = "#fff";
    const clusterLabelShadowColor = "#333";
    const clusters =
        createOrUpdateGroupedSvgElems(svg, graph.clusters, "clusters", "rect")
            .attr("stroke-width", "1")
            .style("fill-opacity", "0.3");

    const clusterLabels = createOrUpdateGroupedSvgElems(svg, graph.clusters, "clusterLabels", "text")
        .attr("font-size", fontSize)
        .style("text-anchor", "middle")
        .call(d3.drag()
            .on("start", (e, d) => {
            })
            .on("drag", (e, d) => {
            })
            .on("end", (e, d) => {
                if (d != null) {
                    self.selectSingleCluster(d);
                    self.beginEditClusterLabel(d);
                    // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
                    const sizeScale = self.svgManager.calcVirtualToPhysicalViewBoxScale();

                    // ビューに依存してしまってるのをどうにかしたい
                    const editControl = document.getElementById("editSelectedClusterLabel");
                    const controlWidth = 170;
                    const viewBoxMinScale = (svg.node().clientWidth / viewBoxWidth);
                    const px = (getClusterLabelPositionX(d) * sizeScale - controlWidth * 0.5) - self.svgManager.viewBoxMinX * viewBoxMinScale;;
                    const py = getClusterLabelPositionY(d, fontSize) * sizeScale - self.svgManager.viewBoxMinY * viewBoxMinScale;
                    editControl.style.left = `${px}px`;
                    editControl.style.top = `${py}px`;

                    // visibilityがビューに反映されるまでラグがあるので、
                    // 少し後にテキストボックスにフォーカスする
                    // 本当はDOMの更新が確実に終わってからフォーカスするようにした方がいい
                    setTimeout(() => editControl.focus(), 100);
                }
            }));


    let previewLinks = svg.select(`#prevEdges`).selectAll("line");
    if (previewLinks.empty()) {
        previewLinks = svg.append("g").attr("id", "prevEdges")
            .selectAll("line")
            .data([g_previewLinkData])
            .enter()
            .append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "gray");
    }

    const radius = g_nodeSize / 2;

    const dragEdgeEvent = d3.drag()
        .on("start", (e, d) => {
        })
        .on("drag", (e, d) => {
        })
        .on("end", (e, d) => {
            if (d != null) {
                self.selectSingleEdge(d);
                self.beginEditEdgeLabel(d);
                // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
                const sizeScale = self.svgManager.calcVirtualToPhysicalViewBoxScale();

                // ビューに依存してしまってるのをどうにかしたい
                const editControl = document.getElementById("editSelectedEdgeLabel");
                const controlWidth = 170;
                const viewBoxMinScale = (svg.node().clientWidth / viewBoxWidth);
                const px = (getEdgeLabelPositionX(d) * sizeScale - controlWidth * 0.5) - self.svgManager.viewBoxMinX * viewBoxMinScale;;
                const py = getEdgeLabelPositionY(d, fontSize) * sizeScale - self.svgManager.viewBoxMinY * viewBoxMinScale;
                editControl.style.left = `${px}px`;
                editControl.style.top = `${py}px`;

                // visibilityがビューに反映されるまでラグがあるので、
                // 少し後にテキストボックスにフォーカスする
                // 本当はDOMの更新が確実に終わってからフォーカスするようにした方がいい
                setTimeout(() => editControl.focus(), 100);
            }
        });

    const editNodeLabelEvent = d3.drag()
        .on("start", (e, d) => {
        })
        .on("drag", (e, d) => {
        })
        .on("end", (e, d) => {
            self.selectSingleNode(d);
            self.isNodeLabelEditing = true;
            if (d != null) {
                // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
                const sizeScale = self.svgManager.calcVirtualToPhysicalViewBoxScale();

                // ビューに依存してしまってるのをどうにかしたい
                const editControl = document.getElementById("editSelectedNodeLabel");
                const controlWidth = 220;
                const viewBoxMinScale = (svg.node().clientWidth / viewBoxWidth);
                const px = (d.x * sizeScale - controlWidth * 0.5) - self.svgManager.viewBoxMinX * viewBoxMinScale;
                const py = (getNodeLabelPositionY(d, radius) * sizeScale - fontSize) - self.svgManager.viewBoxMinY * viewBoxMinScale;
                editControl.style.left = `${px}px`;
                editControl.style.top = `${py}px`;

                // visibilityがビューに反映されるまでラグがあるので、
                // 少し後にテキストボックスにフォーカスする
                // 本当はDOMの更新が確実に終わってからフォーカスするようにした方がいい
                setTimeout(() => editControl.focus(), 100);
            }
        });

    const links =
        createOrUpdateGroupedSvgElems(svg, graph.edges, "edges", "line")
            .attr("stroke-width", 2)
            .attr("stroke", "gray")
            .attr("class", "selectableIcon")
            .call(d3.drag()
                .on("start", (e, d) => {
                })
                .on("drag", (e, d) => {
                })
                .on("end", (e, d) => {
                    self.selectSingleEdge(d);
                }));


    const edgeLabels = createOrUpdateGroupedSvgElems(svg, graph.edges, "edgeLabels", "text")
        .attr("font-size", fontSize)
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        // .attr("filter", "url(#solid)")
        .style("text-shadow", `${edgeLabelShadowColor} ${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px 0px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px 0px 0px`)
        .call(dragEdgeEvent);



    // シミュレーションが終わらないようにアルファターゲットを0.01に設定
    const simulation = d3.forceSimulation(graph.nodes).alphaTarget(0.01);

    let tempSerializedGraph = null;
    const dragNodeCalls = d3.drag()
        .filter(function () {
            // デフォルトだとCtrlキーが押されてると無視されるので、その挙動を無効化
            return true;
        })
        .on("start", (e, d) => {
            tempSerializedGraph = self.graph.toString();
            // if (!e.active) simulation.alpha(0.3).restart();
            d.startX = e.x;
            d.startY = e.y;
            d.fx = e.x;
            d.fy = e.y;
            // d.dragStartPosX = e.x;
            // d.dragStartPosY = e.y;
            // d.isDragMoved = false;
        })
        .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
            // if (!d.isDragMoved) {
            //     const distSqure = (d.dragStartPosX - e.x) * (d.dragStartPosX - e.x) + (d.dragStartPosY - e.y) * (d.dragStartPosY - e.y);
            //     const distThreshold = 2;
            //     if (distSqure > (distThreshold * distThreshold)) {
            //         d.isDragMoved = true;
            //     }
            // }
        })
        .on("end", (e, d) => {
            // if (!e.active) simulation.alphaTarget(0);
            const isPosChanged = d.x != d.startX || d.y != d.startY;
            d.startX = null;
            d.startY = null;

            d.fx = null;
            d.fy = null;
            // if (!d.isSelected) {
            //     self.selectSingleNode(d);
            // }
            // else if (!d.isDragMoved) {
            //     self.toggleSelectNode(d);
            // }

            if (e.sourceEvent.ctrlKey || e.sourceEvent.shiftKey) {
                self.selectAddNode(d);
            }
            else {
                self.selectSingleNode(d);
            }
            if (isPosChanged) {
                self.moveNode(d, d.x, d.y, tempSerializedGraph);
                self.__executeAllCommands();
            }
            self.updateGraph(graphElementId);
        });


    const nodeKeyFunc = x => x.id;
    const nodeSelectionCircles = createOrUpdateGroupedSvgElems(svg, graph.nodes, "nodeCircle", "circle", nodeKeyFunc)
        .attr("r", radius)
        .attr("fill", "#9df")
        .attr("stroke-width", "0")
        .call(dragNodeCalls);

    const nodeFrames = createOrUpdateGroupedSvgElems(svg, graph.nodes, "imageFrames", "circle", nodeKeyFunc)
        .attr("r", radius)
        .attr("fill", imageFrameColor)
        .attr("stroke-width", imageFrameOuterWidth)
        .attr("class", "selectableIcon")
        .attr("stroke", imageFrameOuterColor)
        .call(dragNodeCalls);


    const nodeImages = createOrUpdateGroupedSvgElems(svg, graph.nodes, imageGroupId, "image", nodeKeyFunc)
        .attr("height", g_nodeSize)
        .attr("width", g_nodeSize)
        .attr("class", "selectableIcon")
        .attr("clip-path", d => `url(#circle-clip${d.id})`)
        .call(dragNodeCalls);

    let defs = svg.select("defs");
    if (defs.empty()) {
        defs = svg.append("defs");
        defs.selectAll("marker")
            .data(["arrow"])
            .enter()
            .append("marker")
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", radius)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");
    }

    const nodeImageClipPaths = createOrUpdateSvgElems(defs, graph.nodes, "clipPath", nodeKeyFunc)
        .attr("id", d => "circle-clip" + d.id)
        .append("circle")
        .attr("r", g_nodeSize / 2 - (imageFrameInnerWidth + imageFrameOuterWidth));

    const nodeLabelShadowSize = 1;
    const nodeLabelShadowColor = "#000";
    const nodeLabels = createOrUpdateGroupedSvgElems(svg, graph.nodes, "nodeLabels", "text", nodeKeyFunc)
        .attr("font-size", fontSize)
        .style("text-anchor", "middle")
        .attr("stroke", "white")
        .style("text-shadow", `${nodeLabelShadowColor} ${nodeLabelShadowSize}px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} ${nodeLabelShadowSize}px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} 0px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} 0px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px 0px 0px, ${nodeLabelShadowColor} ${nodeLabelShadowSize}px 0px 0px`)
        // .attr("filter", "url(#solid)")
        .call(editNodeLabelEvent);

    const edgeLabelClickPoints = createOrUpdateGroupedSvgElems(svg, graph.edges, "edgeLabelClickPoints", "rect")
        .attr("r", 10)
        .attr("fill", "#fff")
        .attr("stroke-width", "1")
        .attr("stroke", "#000")
        .on("mouseover", (event, d) => {
            d.mouseOver = true;
            edgeLabelClickPoints
                .attr("width", d => {
                    return d.mouseOver || d.isSelected ? 50 : 0
                });
        })
        .on("mouseout", (event, d) => {
            d.mouseOver = false;
            edgeLabelClickPoints
                .attr("width", d => {
                    return d.mouseOver || d.isSelected ? 50 : 0
                });
        })
        .call(dragEdgeEvent);

    const edgeDragPoints = createOrUpdateGroupedSvgElems(svg, graph.nodes, "edgePoints", "circle", nodeKeyFunc)
        .attr("fill", "#fb9")
        .attr("stroke-width", "5")
        .attr("stroke", "#e96")
        .on("mouseover", (event, d) => {
            d.mouseOver = true;
            edgeDragPoints
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });
        })
        .on("mouseout", (event, d) => {
            d.mouseOver = false;
            edgeDragPoints
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });
        })
        .call(d3.drag()
            .on("start", (e, d) => {
                g_previewLinkData.sourceX = e.x;
                g_previewLinkData.sourceY = e.y;
                g_previewLinkData.targetX = e.x;
                g_previewLinkData.targetY = e.y - radius;
            })
            .on("drag", (e, d) => {
                g_previewLinkData.targetX = e.x;
                g_previewLinkData.targetY = e.y - radius;
                previewLinks
                    .attr("x1", d => d.sourceX)
                    .attr("y1", d => d.sourceY)
                    .attr("x2", d => d.targetX)
                    .attr("y2", d => d.targetY)
                    ;
            })
            .on("end", (e, d) => {
                g_previewLinkData.sourceX = 0;
                g_previewLinkData.sourceY = 0;
                g_previewLinkData.targetX = 0;
                g_previewLinkData.targetY = 0;

                const dropX = e.x;
                const dropY = e.y - radius;

                console.log(`drop pos = (${e.x}, ${e.y})`);
                const droppedNode = graph.nodes.find(node => {
                    const dx = (node.x - dropX);
                    const dy = (node.y - dropY);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    console.log(`${node.id}(${node.displayName}): dist=${dist} < ${radius}`);
                    return dist < radius;
                });
                if (droppedNode != null) {
                    console.log(`dropped on ${droppedNode.displayName}`);
                    droppedNode.isSelected = false;
                    droppedNode.mouseOver = false;
                    self.createNewEdge(d.id, droppedNode.id);
                    self.__executeAllCommands();
                    self.updateGraph(graphElementId);
                }
            }));

    const comments = createOrUpdateGroupedSvgElems(svg, graph.comments, "comments", "text")
        .attr("font-size", fontSize)
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        .style("text-shadow", `${edgeLabelShadowColor} ${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px 0px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px 0px 0px`)
        .call(d3.drag()
            .on("start", (e, d) => {
                tempSerializedGraph = self.graph.toString();
                d.startX = e.x;
                d.startY = e.y;
                d.fx = e.x;
                d.fy = e.y;
            })
            .on("drag", (e, d) => {
                d.fx = e.x;
                d.fy = e.y;
                d.x = d.fx;
                d.y = d.fy;
            })
            .on("end", (e, d) => {
                const isPosChanged = d.x != d.startX || d.y != d.startY;
                d.startX = null;
                d.startY = null;
                d.fx = null;
                d.fy = null;
                self.selectSingleComment(d);

                if (isPosChanged) {
                    self.moveComment(d, d.x, d.y, tempSerializedGraph);
                    self.__executeAllCommands();
                }
                else {
                    self.beginEditComment(d);
                    if (d != null) {
                        // ビューからスケール計算(DOM構築後じゃないと計算できないので、ここで計算)
                        const sizeScale = self.svgManager.calcVirtualToPhysicalViewBoxScale();

                        // ビューに依存してしまってるのをどうにかしたい
                        const editControl = document.getElementById("editSelectedComment");
                        const controlWidth = 170;
                        const viewBoxMinScale = (svg.node().clientWidth / viewBoxWidth);
                        const px = (d.x * sizeScale - controlWidth * 0.5) - self.svgManager.viewBoxMinX * viewBoxMinScale;;
                        const py = d.y * sizeScale - self.svgManager.viewBoxMinY * viewBoxMinScale;
                        editControl.style.left = `${px}px`;
                        editControl.style.top = `${py}px`;

                        // visibilityがビューに反映されるまでラグがあるので、
                        // 少し後にテキストボックスにフォーカスする
                        // 本当はDOMの更新が確実に終わってからフォーカスするようにした方がいい
                        setTimeout(() => editControl.focus(), 100);
                    }
                }
            }));

    nodeImages
        .on("mouseover", (event, d) => {
            d.mouseOver = true;
            edgeDragPoints
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });
        })
        .on("mouseout", (event, d) => {
            d.mouseOver = false;
            edgeDragPoints
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });
        });

    links
        .on("mouseover", (event, d) => {
            if (d.label != "") return;
            d.mouseOver = true;
            edgeLabelClickPoints
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });
        })
        .on("mouseout", (event, d) => {
            if (d.label != "") return;
            d.mouseOver = false;
            edgeLabelClickPoints
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });
        });

    simulation
        .on("tick", () => {
            const nodeDict = {};
            graph.nodes.forEach(x => nodeDict[x.id] = x);
            for (let edge of graph.edges) {
                edge.sourceNode = nodeDict[edge.actualSource];
                edge.destinationNode = nodeDict[edge.actualDestination];
                edge.labelOffsetX = labelOffsetX;
                edge.labelOffsetY = labelOffsetY;
            }
            links
                .attr("x1", d => d.sourceNode?.x ?? 0)
                .attr("y1", d => d.sourceNode?.y ?? 0)
                .attr("x2", d => d.destinationNode?.x ?? 0)
                .attr("y2", d => d.destinationNode?.y ?? 0)
                .attr("marker-start", d => d.dir == "back" || d.dir == "both" ? "url(#arrow)" : "")
                .attr("marker-end", d => d.dir == "forward" || d.dir == "both" ? "url(#arrow)" : "")
                .attr("stroke", d => d.isSelected || d.mouseOver ? "#ddd" : "gray")
                ;

            previewLinks
                .attr("x1", d => d.sourceX)
                .attr("y1", d => d.sourceY)
                .attr("x2", d => d.targetX)
                .attr("y2", d => d.targetY)
                ;

            clusters
                .attr("x", d => d.x)
                .attr("y", d => d.y)
                .attr("width", d => d.width)
                .attr("height", d => d.height)
                .attr("stroke", d => d.labelColor)
                .style("fill", d => d.color)
                ;

            edgeLabels
                .attr("y", d => getEdgeLabelPositionY(d, fontSize))
                .html(d => getEdgeLabel(d, fontSize));

            clusterLabels
                .attr("stroke", d => d.labelColor)
                .style("text-shadow", d => getTextShadowStyle(d.labelShadowColor, edgeLabelShadowSize))
                .attr("y", d => getClusterLabelPositionY(d, fontSize))
                .html(d => getClusterLabel(d, fontSize));

            comments
                .text(d => d.text)
                .attr("x", d => d.x)
                .attr("y", d => d.y)
                .attr("stroke", d => d.isSelected ? "#aaa" : "black")
                .html(d => getCommentText(d, fontSize));

            edgeLabelClickPoints
                .attr("x", d => getEdgeLabelPositionX(d) - 50 / 2)
                .attr("y", d => getEdgeLabelPositionY(d, fontSize) - 10 / 2)
                .attr("width", d => {
                    return d.mouseOver ? 50 : 0
                })
                .attr("height", d => {
                    return d.mouseOver ? 20 : 0
                })
                ;

            const selectionBorderWidth = 5;
            nodeSelectionCircles
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", d => d.mouseOver || d.isSelected ? radius + selectionBorderWidth : 0)
                ;

            edgeDragPoints
                .attr("cx", d => d.x)
                .attr("cy", d => d.y - radius)
                .attr("r", d => {
                    return d.mouseOver ? 10 : 0
                });

            nodeImages
                .attr("href", d => d.imagePath)
                .attr("x", d => d.x - radius)
                .attr("y", d => d.y - radius)
                .attr("clip-path", d => d.hasImage ? `url(#circle-clip${d.id})` : "")
                ;

            nodeFrames
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                ;

            nodeLabels
                .text(d => d.displayName)
                .attr("x", d => d.x)
                .attr("y", d => getNodeLabelPositionY(d, radius));

            nodeImageClipPaths
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
}