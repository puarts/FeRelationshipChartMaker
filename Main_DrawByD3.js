
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

function getNodeLabelPositionY(d, radius) {
    return d.hasImage ? d.y + radius - 5 : d.y + 5;
}

/**
 * @param  {AppData} self
 * @param  {string} graphElementId
 * @param  {Graph} graph
 * @param  {Number} imageSize
 */
function updateGraphByD3js(
    self, graphElementId, graph, imageSize, canvasWidth, canvasHeight
) {
    const imageFrameInnerWidth = 5;
    const imageFrameOuterWidth = 2;
    const imageFrameColor = "#ffdd99";
    const imageFrameOuterColor = "#ffaa00";
    const fontSize = 13;
    const labelOffsetX = 0;
    const labelOffsetY = fontSize * 0.3;

    const svg = d3.create("svg")
        .attr("width", canvasWidth)
        .attr("height", canvasHeight);

    svg.call(d3.drag()
        .on("start", (e, d) => {
        })
        .on("drag", (e, d) => {
        })
        .on("end", (e, d) => {
            // クリック時にノード追加
            console.log(`click (${e.x}, ${e.y})`);
            const nodeId = AppData.estimateNodeId(self.graph);
            const defaultCharIdAndName = self.titleToCharOptions[self.currentTitle][1];
            const node = new GraphNode(nodeId, defaultCharIdAndName.id);
            node.setPos(e.x, e.y);
            self.addNode(node);
            self.selectSingleNode(node);
            self.updateGraph(graphElementId);
        }));

    // ノードの位置が原点にある場合だけ自動的にレイアウトを決めます。
    {
        let i = 0;
        for (const node of graph.nodes) {
            if (node.x == 0 && node.y == 0) {
                node.x = imageSize * i * 2 + imageSize;
                node.y = imageSize;
                ++i;
            }
        }
    }

    const radius = imageSize / 2;

    const previewLinkData = new PreviewLink();
    const previewLinks = svg.append("g").attr("id", "edges")
        .selectAll("line")
        .data([previewLinkData])
        .enter()
        .append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "gray");

    const dragEdgeEvent = d3.drag()
        .on("start", (e, d) => {
        })
        .on("drag", (e, d) => {
        })
        .on("end", (e, d) => {
            // クリック時にノード追加
            self.selectSingleEdge(d);
            if (d != null) {
                // ビューに依存してしまってるのをどうにかしたい
                const editControl = document.getElementById("editSelectedEdgeLabel");
                const controlWidth = 170;
                const px = getEdgeLabelPositionX(d) - controlWidth * 0.5;
                const py = getEdgeLabelPositionY(d, fontSize);
                console.log(`(${px},${py})`);
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
            // クリック時にノード追加
            self.selectSingleNode(d);
            self.isNodeLabelEditing = true;
            if (d != null) {
                // ビューに依存してしまってるのをどうにかしたい
                const editControl = document.getElementById("editSelectedNodeLabel");
                const controlWidth = 220;
                const px = d.x - controlWidth * 0.5;
                const py = getNodeLabelPositionY(d, radius) - fontSize;
                console.log(`(${px},${py})`);
                editControl.style.left = `${px}px`;
                editControl.style.top = `${py}px`;

                // visibilityがビューに反映されるまでラグがあるので、
                // 少し後にテキストボックスにフォーカスする
                // 本当はDOMの更新が確実に終わってからフォーカスするようにした方がいい
                setTimeout(() => editControl.focus(), 100);
            }
        });

    const links = svg.append("g").attr("id", "edges")
        .selectAll("line")
        .data(graph.edges)
        .enter()
        .append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "gray")
        .attr("class", "selectableIcon")
        .on("mouseover", (event, d) => {
            d.mouseOver = true;
        })
        .on("mouseout", (event, d) => {
            d.mouseOver = false;
        })
        .call(dragEdgeEvent);

    const edgeLabelShadowSize = 1;
    const edgeLabelShadowColor = "#fff";
    const edgeLabels = svg.append("g").attr("id", "edgeLabels")
        .selectAll("text")
        .data(graph.edges)
        .enter()
        .append("text")
        .attr("font-size", fontSize)
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        // .attr("filter", "url(#solid)")
        .style("text-shadow", `${edgeLabelShadowColor} ${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px 0px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px 0px 0px`)
        .call(dragEdgeEvent);

    const simulation = d3.forceSimulation(graph.nodes)
    const dragNodeCalls = d3.drag()
        .on("start", (e, d) => {
            if (!e.active) simulation.alpha(0.3).restart();
            d.fx = e.x;
            d.fy = e.y;
            d.dragStartPosX = e.x;
            d.dragStartPosY = e.y;
            d.isDragMoved = false;
        })
        .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
            if (!d.isDragMoved) {
                const distSqure = (d.dragStartPosX - e.x) * (d.dragStartPosX - e.x) + (d.dragStartPosY - e.y) * (d.dragStartPosY - e.y);
                const distThreshold = 2;
                if (distSqure > (distThreshold * distThreshold)) {
                    d.isDragMoved = true;
                }
            }
        })
        .on("end", (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            console.log(`drop pos = (${e.x}, ${e.y})`);

            d.fx = null;
            d.fy = null;
            if (!d.isSelected) {
                self.selectSingleNode(d);
            }
            else if (!d.isDragMoved) {
                self.toggleSelectNode(d);
            }
        });



    const node = svg.append("g").attr("id", "nodeCircle")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", radius)
        .attr("fill", "#9df")
        .attr("stroke-width", "0")
        .call(dragNodeCalls);

    const imageFrame = svg.append("g").attr("id", "imageFrames")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", radius)
        .attr("fill", imageFrameColor)
        .attr("stroke-width", imageFrameOuterWidth)
        .attr("class", "selectableIcon")
        .attr("stroke", imageFrameOuterColor)
        .call(dragNodeCalls);




    const images = svg.append("g").attr("id", "images")
        .selectAll("image")
        .data(graph.nodes)
        .enter()
        .append("image")
        .attr("href", d => d.imagePath)
        .attr("height", imageSize)
        .attr("width", imageSize)
        .attr("class", "selectableIcon")
        .attr("clip-path", d => `url(#circle-clip${d.id})`)
        .call(dragNodeCalls);

    const clipPaths = svg
        .append("defs")
        .selectAll("clipPath")
        .data(graph.nodes)
        .enter()
        .append("clipPath")
        .attr("id", d => "circle-clip" + d.id)
        .append("circle")
        .attr("r", imageSize / 2 - (imageFrameInnerWidth + imageFrameOuterWidth));

    const defs = svg.append("defs");
    const filter = defs.selectAll("filter")
        .data(["solid"])
        .enter()
        .append("filter")
        .attr("id", String);
    filter
        .append("feFlood")
        .attr("flood-color", "#eee")
        .attr("result", "bg")
        .attr("flood-opacity", "0.8");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "bg");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");


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

    const nodeLabelShadowSize = 1;
    const nodeLabelShadowColor = "#000";
    const nodeLabels = svg.append("g")
        .selectAll("text")
        .data(graph.nodes)
        .enter()
        .append("text")
        .attr("font-size", fontSize)
        .style("text-anchor", "middle")
        .attr("stroke", "white")
        .style("text-shadow", `${nodeLabelShadowColor} ${nodeLabelShadowSize}px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} ${nodeLabelShadowSize}px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} 0px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} 0px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px 0px 0px, ${nodeLabelShadowColor} ${nodeLabelShadowSize}px 0px 0px`)
        // .attr("filter", "url(#solid)")
        .text(x => x.displayName)
        .call(editNodeLabelEvent);

    const edgeDragPoints = svg.append("g").attr("id", "edgePoints")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 10)
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
                previewLinkData.sourceX = e.x;
                previewLinkData.sourceY = e.y;
                previewLinkData.targetX = e.x;
                previewLinkData.targetY = e.y - radius;
            })
            .on("drag", (e, d) => {
                previewLinkData.targetX = e.x;
                previewLinkData.targetY = e.y - radius;
                previewLinks
                    .attr("x1", d => d.sourceX)
                    .attr("y1", d => d.sourceY)
                    .attr("x2", d => d.targetX)
                    .attr("y2", d => d.targetY)
                    ;
            })
            .on("end", (e, d) => {
                previewLinkData.sourceX = 0;
                previewLinkData.sourceY = 0;
                previewLinkData.targetX = 0;
                previewLinkData.targetY = 0;

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
                    self.updateGraph(graphElementId);
                }
            }));


    images
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

    const nodeDict = {};
    graph.nodes.forEach(x => nodeDict[x.id] = x);
    for (let edge of graph.edges) {
        edge.sourceNode = nodeDict[edge.actualSource];
        edge.destinationNode = nodeDict[edge.actualDestination];
        edge.labelOffsetX = labelOffsetX;
        edge.labelOffsetY = labelOffsetY;
    }
    simulation
        .on("tick", () => {
            links
                .attr("x1", d => d.sourceNode?.x ?? 0)
                .attr("y1", d => d.sourceNode?.y ?? 0)
                .attr("x2", d => d.destinationNode?.x ?? 0)
                .attr("y2", d => d.destinationNode?.y ?? 0)
                .attr("marker-start", d => d.dir == "back" || d.dir == "both" ? "url(#arrow)" : "")
                .attr("marker-end", d => d.dir == "forward" || d.dir == "both" ? "url(#arrow)" : "")
                ;

            previewLinks
                .attr("x1", d => d.sourceX)
                .attr("y1", d => d.sourceY)
                .attr("x2", d => d.targetX)
                .attr("y2", d => d.targetY)
                ;

            edgeLabels
                .attr("y", d => getEdgeLabelPositionY(d, fontSize))
                .html(d => {
                    // 改行に対応
                    let result = "";
                    const x = getEdgeLabelPositionX(d);
                    for (const line of d.label.split(/\r?\n/)) {
                        result += `<tspan x='${x}' dy='${fontSize}px'>${line}</tspan>`;
                    }
                    return result;
                })
                ;

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", d => d.mouseOver || d.isSelected ? radius + 8 : 0)
                ;

            edgeDragPoints
                .attr("cx", d => d.x)
                .attr("cy", d => d.y - radius)
                .attr("r", d => {
                    return d.mouseOver || d.isSelected ? 10 : 0
                });

            images
                .attr("x", d => d.x - radius)
                .attr("y", d => d.y - radius)
                .attr("clip-path", d => d.hasImage ? `url(#circle-clip${d.id})` : "")
                ;

            imageFrame
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                ;

            nodeLabels
                .attr("x", d => d.x)
                .attr("y", d => getNodeLabelPositionY(d, radius));

            clipPaths
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

    const chart = svg.node();
    const area = document.getElementById(`${graphElementId}`);
    area.appendChild(chart);
    self.updateMessage("");
}