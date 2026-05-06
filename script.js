const IGNORED_FIELDS = ['modifiers', 'columns'];

let json1 = null;
let json2 = null;
let diffResult = null;

const file1Input = document.getElementById('file1');
const file2Input = document.getElementById('file2');
const compareBtn = document.getElementById('compareBtn');
const summaryEl = document.getElementById('summary');
const subControlsEl = document.getElementById('subControls');
const searchInput = document.getElementById('searchInput');
const filterMatched = document.getElementById('filterMatched');
const filterAdded = document.getElementById('filterAdded');
const filterRemoved = document.getElementById('filterRemoved');
const filterModified = document.getElementById('filterModified');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const expandPCBtn = document.getElementById('expandPCBtn');
const exportBtn = document.getElementById('exportBtn');
const treeContainer1 = document.getElementById('treeContainer1');
const treeContainer2 = document.getElementById('treeContainer2');
const dualTreeView = document.getElementById('dualTreeView');
const initialMessage = document.getElementById('initialMessage');

file1Input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file1Info').textContent = file.name;
        document.getElementById('treeHeader1').textContent = `File 1: ${file.name}`;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                json1 = JSON.parse(e.target.result);
                checkReady();
            } catch (err) {
                alert('Error parsing File 1: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
});

file2Input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file2Info').textContent = file.name;
        document.getElementById('treeHeader2').textContent = `File 2: ${file.name}`;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                json2 = JSON.parse(e.target.result);
                checkReady();
            } catch (err) {
                alert('Error parsing File 2: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
});

function checkReady() {
    compareBtn.disabled = !(json1 && json2);
}

compareBtn.addEventListener('click', () => {
    diffResult = compareJson(json1, json2, '');
    renderDiff(diffResult);
    updateSummary(diffResult);
});

searchInput.addEventListener('input', applyFilters);
[filterMatched, filterAdded, filterRemoved, filterModified].forEach(el => {
    el.addEventListener('change', applyFilters);
});

expandAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.children').forEach(el => {
        el.classList.add('expanded');
    });
    document.querySelectorAll('.node-toggle').forEach(el => {
        if (el.textContent === '▶') el.textContent = '▼';
    });
});

collapseAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.children').forEach(el => {
        if (!el.parentElement.classList.contains('tree-container')) {
            el.classList.remove('expanded');
        }
    });
    document.querySelectorAll('.node-toggle').forEach(el => {
        if (el.textContent === '▼') el.textContent = '▶';
    });
});

expandPCBtn.addEventListener('click', () => {
    const containers = [treeContainer1, treeContainer2];
    containers.forEach(container => {
        const pcNodes = container.querySelectorAll('.product-codes-node');
        pcNodes.forEach(pcNode => {
            // 1. Expand all parents of pcNode
            let parent = pcNode.parentElement.closest('.tree-node');
            while (parent) {
                const pChildren = parent.querySelector(':scope > .children');
                if (pChildren) pChildren.classList.add('expanded');
                const pToggle = parent.querySelector(':scope > .node-header .node-toggle');
                if (pToggle && pToggle.textContent === '▶') pToggle.textContent = '▼';
                parent = parent.parentElement.closest('.tree-node');
            }

            // 2. Expand pcNode itself and all its descendants
            const pcChildren = pcNode.querySelector(':scope > .children');
            if (pcChildren) {
                pcChildren.classList.add('expanded');
                const toggle = pcNode.querySelector(':scope > .node-header .node-toggle');
                if (toggle && toggle.textContent === '▶') toggle.textContent = '▼';
                
                pcChildren.querySelectorAll('.children').forEach(c => {
                    c.classList.add('expanded');
                });
                pcChildren.querySelectorAll('.node-toggle').forEach(t => {
                    if (t.textContent === '▶') t.textContent = '▼';
                });
            }
        });
    });
});

exportBtn.addEventListener('click', () => {
    if (!diffResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diffResult, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "diff_result.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const showMatched = filterMatched.checked;
    const showAdded = filterAdded.checked;
    const showRemoved = filterRemoved.checked;
    const showModified = filterModified.checked;

    const containers = [treeContainer1, treeContainer2];
    
    containers.forEach(container => {
        const nodes = container.querySelectorAll('.tree-node');
        
        nodes.forEach(node => {
            node.classList.add('hidden');
        });

        nodes.forEach(node => {
            const header = node.querySelector(':scope > .node-header');
            if (!header) return;
            
            const statusLabel = header.querySelector('.status-label');
            const text = header.textContent.toLowerCase();
            
            let matchesStatus = false;
            if (statusLabel) {
                if (statusLabel.classList.contains('matched') && showMatched) matchesStatus = true;
                if (statusLabel.classList.contains('added') && showAdded) matchesStatus = true;
                if (statusLabel.classList.contains('removed') && showRemoved) matchesStatus = true;
                if (statusLabel.classList.contains('modified') && showModified) matchesStatus = true;
            }

            const matchesQuery = query ? text.includes(query) : true;

            if (matchesStatus && matchesQuery) {
                node.classList.remove('hidden');
            } else if (!statusLabel && query && text.includes(query)) {
                node.classList.remove('hidden');
            } else if (!statusLabel && !query) {
                // If no status label and no query, it's a container that should be visible if its children are
                // We leave it hidden for now, the parent-unhiding loop will handle it
            }
        });

        // Ensure parents of visible nodes are visible
        let hasVisible = true;
        while (hasVisible) {
            hasVisible = false;
            container.querySelectorAll('.tree-node:not(.hidden)').forEach(node => {
                let parent = node.parentElement.closest('.tree-node');
                if (parent && parent.classList.contains('hidden')) {
                    parent.classList.remove('hidden');
                    hasVisible = true;
                }
            });
        }
    });
}

function updateSummary(diff) {
    summaryEl.style.display = 'flex';
    subControlsEl.style.display = 'flex';
    document.getElementById('matchedCount').textContent = diff.stats.matched;
    document.getElementById('addedCount').textContent = diff.stats.added;
    document.getElementById('removedCount').textContent = diff.stats.removed;
    document.getElementById('modifiedCount').textContent = diff.stats.modified;
    applyFilters();
}

function compareJson(obj1, obj2, path) {
    const result = {
        type: 'root',
        path: path,
        stats: { matched: 0, added: 0, removed: 0, modified: 0 },
        children: [],
        oldValue: obj1,
        newValue: obj2
    };

    if (obj1 === obj2) {
        result.type = 'equal';
        result.value = obj1;
        result.stats.matched++;
        return result;
    }

    if (obj1 === null || obj2 === null) {
        result.type = obj1 === null ? 'added' : 'removed';
        result.value = obj1 !== null ? obj1 : obj2;
        if (obj1 === null) result.stats.added++;
        else result.stats.removed++;
        return result;
    }

    const type1 = Array.isArray(obj1) ? 'array' : typeof obj1;
    const type2 = Array.isArray(obj2) ? 'array' : typeof obj2;

    if (type1 !== type2) {
        result.type = 'modified';
        result.stats.modified++;
        return result;
    }

    if (type1 === 'object') {
        result.type = 'object';
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
            const isIgnored = IGNORED_FIELDS.includes(key);
            const childPath = path ? `${path}.${key}` : key;
            if (!keys1.includes(key)) {
                const addedNode = {
                    type: 'added',
                    key: key,
                    path: childPath,
                    value: obj2[key],
                    newValue: obj2[key],
                    inBoth: false,
                    isIgnored: isIgnored,
                    count2: Array.isArray(obj2[key]) ? obj2[key].length : null,
                    stats: { matched: 0, added: 1, removed: 0, modified: 0 }
                };
                result.children.push(addedNode);
                if (isIgnored) result.stats.matched++;
                else result.stats.added++;
            } else if (!keys2.includes(key)) {
                const removedNode = {
                    type: 'removed',
                    key: key,
                    path: childPath,
                    value: obj1[key],
                    oldValue: obj1[key],
                    inBoth: false,
                    isIgnored: isIgnored,
                    count1: Array.isArray(obj1[key]) ? obj1[key].length : null,
                    stats: { matched: 0, added: 0, removed: 1, modified: 0 }
                };
                result.children.push(removedNode);
                if (isIgnored) result.stats.matched++;
                else result.stats.removed++;
            } else {
                const childResult = compareJson(obj1[key], obj2[key], childPath);
                childResult.key = key;
                childResult.inBoth = true;
                childResult.isIgnored = isIgnored;
                
                // Set record counts for any arrays
                if (Array.isArray(obj1[key])) childResult.count1 = obj1[key].length;
                if (Array.isArray(obj2[key])) childResult.count2 = obj2[key].length;
                
                result.children.push(childResult);
                
                if (isIgnored) {
                    result.stats.matched++;
                } else {
                    result.stats.matched += childResult.stats.matched;
                    result.stats.added += childResult.stats.added;
                    result.stats.removed += childResult.stats.removed;
                    result.stats.modified += childResult.stats.modified;
                }
            }
        }
    } else if (type1 === 'array') {
        result.type = 'array';
        result.count1 = obj1.length;
        result.count2 = obj2.length;
        
        const findCommonIdKey = (arr) => {
            const idKeys = ['id', 'name', 'code', 'key', 'uuid'];
            for (const item of arr) {
                if (item && typeof item === 'object') {
                    for (const key of idKeys) {
                        if (key in item) return key;
                    }
                }
            }
            return null;
        };

        const idKey1 = findCommonIdKey(obj1);
        const idKey2 = findCommonIdKey(obj2);
        const idKey = idKey1 === idKey2 ? idKey1 : (idKey1 || idKey2);

        if (idKey && obj1.every(i => i && typeof i === 'object') && obj2.every(i => i && typeof i === 'object')) {
            const map1 = new Map(obj1.map((item, index) => [item[idKey], {item, index}]));
            const map2 = new Map(obj2.map((item, index) => [item[idKey], {item, index}]));
            
            const allIds = new Set([...map1.keys(), ...map2.keys()]);
            
            for (const id of allIds) {
                const val1 = map1.get(id);
                const val2 = map2.get(id);
                
                if (!val1) {
                    const childPath = `${path}[${val2.index}]`;
                    const addedNode = {
                        type: 'added',
                        key: `[${val2.index}] (${idKey}:${id})`,
                        path: childPath,
                        value: val2.item,
                        newValue: val2.item,
                        stats: { matched: 0, added: 1, removed: 0, modified: 0 }
                    };
                    result.children.push(addedNode);
                    result.stats.added++;
                } else if (!val2) {
                    const childPath = `${path}[${val1.index}]`;
                    const removedNode = {
                        type: 'removed',
                        key: `[${val1.index}] (${idKey}:${id})`,
                        path: childPath,
                        value: val1.item,
                        oldValue: val1.item,
                        stats: { matched: 0, added: 0, removed: 1, modified: 0 }
                    };
                    result.children.push(removedNode);
                    result.stats.removed++;
                } else {
                    const childPath = `${path}[${val1.index}->${val2.index}]`;
                    const childResult = compareJson(val1.item, val2.item, childPath);
                    childResult.key = `[${val1.index}] (${idKey}:${id})`;
                    result.children.push(childResult);
                    result.stats.matched += childResult.stats.matched;
                    result.stats.added += childResult.stats.added;
                    result.stats.removed += childResult.stats.removed;
                    result.stats.modified += childResult.stats.modified;
                }
            }
        } else {
            const unmatched1 = obj1.map((item, index) => ({ item, index }));
            const unmatched2 = obj2.map((item, index) => ({ item, index }));
            
            const isDeepEqual = (a, b) => {
                if (a === b) return true;
                if (a === null || b === null) return false;
                if (typeof a !== typeof b) return false;
                if (typeof a !== 'object') return false;
                
                const isArrA = Array.isArray(a);
                const isArrB = Array.isArray(b);
                if (isArrA !== isArrB) return false;
                
                if (isArrA) {
                    if (a.length !== b.length) return false;
                    for (let i = 0; i < a.length; i++) {
                        if (!isDeepEqual(a[i], b[i])) return false;
                    }
                    return true;
                }
                
                const keysA = Object.keys(a).filter(k => !IGNORED_FIELDS.includes(k));
                const keysB = Object.keys(b).filter(k => !IGNORED_FIELDS.includes(k));
                if (keysA.length !== keysB.length) return false;
                
                for (const key of keysA) {
                    if (!keysB.includes(key)) return false;
                    if (!isDeepEqual(a[key], b[key])) return false;
                }
                return true;
            };

            // 1. Find and pair perfectly identical items
            for (let i = 0; i < unmatched1.length; i++) {
                const item1 = unmatched1[i];
                if (!item1) continue;
                
                for (let j = 0; j < unmatched2.length; j++) {
                    const item2 = unmatched2[j];
                    if (!item2) continue;
                    
                    if (isDeepEqual(item1.item, item2.item)) {
                        const childPath = `${path}[${item1.index}->${item2.index}]`;
                        const childResult = compareJson(item1.item, item2.item, childPath);
                        childResult.key = `[${item1.index}]`;
                        result.children.push(childResult);
                        result.stats.matched += childResult.stats.matched;
                        result.stats.added += childResult.stats.added;
                        result.stats.removed += childResult.stats.removed;
                        result.stats.modified += childResult.stats.modified;
                        
                        unmatched1[i] = null;
                        unmatched2[j] = null;
                        break;
                    }
                }
            }

            // 2. Everything else is treated as a separate Add/Remove
            for (const item1 of unmatched1) {
                if (item1) {
                    const childPath = `${path}[${item1.index}]`;
                    const removedNode = {
                        type: 'removed',
                        key: `[${item1.index}]`,
                        path: childPath,
                        value: item1.item,
                        oldValue: item1.item,
                        stats: { matched: 0, added: 0, removed: 1, modified: 0 }
                    };
                    result.children.push(removedNode);
                    result.stats.removed++;
                }
            }
            
            for (const item2 of unmatched2) {
                if (item2) {
                    const childPath = `${path}[${item2.index}]`;
                    const addedNode = {
                        type: 'added',
                        key: `[${item2.index}]`,
                        path: childPath,
                        value: item2.item,
                        newValue: item2.item,
                        stats: { matched: 0, added: 1, removed: 0, modified: 0 }
                    };
                    result.children.push(addedNode);
                    result.stats.added++;
                }
            }
        }
    } else {
        if (typeof obj1 === 'number' && typeof obj2 === 'number') {
            if (obj1 !== obj2) {
                result.type = 'modified';
                result.stats.modified++;
            } else {
                result.type = 'equal';
                result.value = obj1;
                result.stats.matched++;
            }
        } else {
            result.type = obj1 === obj2 ? 'equal' : 'modified';
            if (obj1 === obj2) {
                result.stats.matched++;
            } else {
                result.stats.modified++;
            }
        }
    }

    return result;
}

        function getStatusLabel(statusClass, isIgnored) {
            const text = isIgnored ? 'MATCHED' : (statusClass.toUpperCase());
            const icon = isIgnored ? '✓' : (statusClass === 'matched' ? '✓' : (statusClass === 'added' ? '+' : (statusClass === 'removed' ? '-' : '~')));
            return `<span class="status-label ${isIgnored ? 'matched' : statusClass}">${text} ${icon}</span>`;
        }

        function renderRawObject(val, key, path, side, depth, statusClass, statusIcon, isRoot = false, isIgnored = false) {
            const container = document.createElement('div');
            container.className = 'tree-node';
            if (key === 'product_codes') container.classList.add('product-codes-node');

            const fullStatusLabel = getStatusLabel(statusClass, isIgnored);
            // Hide the label visually if it's redundant, but keep it in DOM for filtering
            const showLabel = (depth === 0 || isIgnored);
            const statusLabelHtml = showLabel ? fullStatusLabel : `<span class="status-label ${isIgnored ? 'matched' : statusClass}" style="display:none;"></span>`;

            if (val === null || typeof val !== 'object') {
                const displayVal = formatValue(val);
                container.innerHTML = `
                    <span class="node-header">
                        <span class="node-toggle"></span>
                        <span class="node-key">${isRoot ? 'Root' : key}</span>
                        <span class="node-value">${displayVal}</span>
                        ${statusLabelHtml}
                        <span class="node-path">${path}</span>
                    </span>`;
                return container;
            }

            const isArray = Array.isArray(val);
            const typeIcon = isArray ? '📋' : '📁';
            const typeStr = isArray ? 'array' : 'object';
            
            const keys = Object.keys(val);
            const hasChildren = keys.length > 0;
            const toggle = hasChildren ? `<span class="node-toggle" onclick="toggleNode(this)">▶</span>` : '<span class="node-toggle"></span>';
            
            let recordCountStr = '';
            if (isArray) {
                recordCountStr = `<span class="node-type" style="margin-left: 8px; color: #dcdcaa;">(${val.length} items)</span>`;
            }

            container.innerHTML = `
                <span class="node-header" onclick="toggleNode(this)">
                    ${toggle}
                    <span class="node-type">${typeIcon}</span>
                    <span class="node-key">${isRoot ? 'Root' : key}</span>
                    <span class="node-type">${typeStr}</span>
                    ${recordCountStr}
                    ${statusLabelHtml}
                    <span class="node-path">${path}</span>
                </span>`;

            if (hasChildren) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'children';
                for (const k of keys) {
                    const childPath = isArray ? `${path}[${k}]` : (path ? `${path}.${k}` : k);
                    const childIsIgnored = !isArray && IGNORED_FIELDS.includes(k);
                    childrenContainer.appendChild(renderRawObject(val[k], k, childPath, side, depth + 1, statusClass, statusIcon, false, childIsIgnored));
                }
                container.appendChild(childrenContainer);
            }
            return container;
        }

        function renderDiff(diff, isRoot = true) {
            dualTreeView.style.display = 'flex';
            initialMessage.style.display = 'none';

            if (isRoot && diff.type === 'equal' && diff.children.length === 0) {
                treeContainer1.innerHTML = '<div class="no-files">Files are identical</div>';
                treeContainer2.innerHTML = '<div class="no-files">Files are identical</div>';
                return;
            }

            treeContainer1.innerHTML = '';
            treeContainer2.innerHTML = '';
            
            const node1 = renderNode(diff, 1, 0, isRoot);
            const node2 = renderNode(diff, 2, 0, isRoot);
            
            if (node1) treeContainer1.appendChild(node1);
            if (node2) treeContainer2.appendChild(node2);
        }

        function renderNode(node, side, depth, isRoot = false) {
            // Filter nodes based on side
            if (side === 1 && node.type === 'added') return null;
            if (side === 2 && node.type === 'removed') return null;

            const container = document.createElement('div');
            container.className = 'tree-node';
            if (node.key === 'product_codes') container.classList.add('product-codes-node');

            const statusClass = node.isIgnored ? 'matched' : (node.type === 'equal' ? 'matched' : node.type);
            const statusLabel = getStatusLabel(statusClass, node.isIgnored);

            // If it's an ignored object/array/modified branch, force a raw render to show all fields as they are on this side
            if (node.isIgnored && (node.type === 'object' || node.type === 'array' || node.type === 'modified')) {
                const val = side === 1 ? node.oldValue : node.newValue;
                if (val !== null && typeof val === 'object') {
                    return renderRawObject(val, node.key, node.path, side, 0, 'matched', '✓', isRoot, true);
                }
            }

            if (node.type === 'equal') {
                if (node.value !== null && typeof node.value === 'object') {
                    return renderRawObject(node.value, node.key, node.path, side, 0, 'matched', '✓', isRoot, node.isIgnored);
                }
                const value = formatValue(node.value);
                container.innerHTML = `
                    <span class="node-header">
                        <span class="node-toggle"></span>
                        <span class="node-key">${isRoot ? 'Root' : node.key}</span>
                        <span class="node-value">${value}</span>
                        ${statusLabel}
                        <span class="node-path">${node.path}</span>
                    </span>`;
                return container;
            }

            if (node.type === 'modified') {
                const val = side === 1 ? node.oldValue : node.newValue;
                if (val !== null && typeof val === 'object') {
                    return renderRawObject(val, node.key, node.path, side, 0, statusClass, '~', isRoot, node.isIgnored);
                }
                const displayVal = formatValue(val, true);
                container.innerHTML = `
                    <span class="node-header">
                        <span class="node-toggle"></span>
                        <span class="node-key">${node.key}</span>
                        <span class="node-value ${node.isIgnored ? '' : 'modified'}">${displayVal}</span>
                        ${statusLabel}
                        <span class="node-path">${node.path}</span>
                    </span>`;
                return container;
            }

            if (node.type === 'added' || node.type === 'removed') {
                if (node.value !== null && typeof node.value === 'object') {
                    return renderRawObject(node.value, node.key, node.path, side, 0, statusClass, (node.type === 'added' ? '+' : '-'), isRoot, node.isIgnored);
                }
                const value = formatValue(node.value, true);
                container.innerHTML = `
                    <span class="node-header">
                        <span class="node-toggle"></span>
                        <span class="node-key">${node.key}</span>
                        <span class="node-value">${value}</span>
                        ${statusLabel}
                        <span class="node-path">${node.path}</span>
                    </span>`;
                return container;
            }

            if (node.type === 'object' || node.type === 'array' || node.type === 'root') {
        const typeIcon = node.type === 'object' ? '📁' : (node.type === 'array' ? '📋' : '');
        
        // Sort children: Match/Modified > Side-specific (Added or Removed)
        const sortedChildren = [...(node.children || [])].sort((a, b) => {
            const getRank = (n) => {
                if (n.type === 'equal' || n.type === 'modified' || n.type === 'object' || n.type === 'array') return 1;
                if (side === 1 && n.type === 'removed') return 2;
                if (side === 2 && n.type === 'added') return 2;
                return 3;
            };
            return getRank(a) - getRank(b);
        });

        let renderedChildren = [];
        for (const child of sortedChildren) {
            const childEl = renderNode(child, side, depth + 1);
            if (childEl) renderedChildren.push(childEl);
        }

        if (renderedChildren.length === 0 && node.type !== 'root') {
            // If no children rendered for this side, don't show the parent either (unless root)
            if (node.type === 'added' && side === 1) return null;
            if (node.type === 'removed' && side === 2) return null;
        }

        const hasChildren = renderedChildren.length > 0;
        const toggle = hasChildren ? `<span class="node-toggle" onclick="toggleNode(this)">${node.type === 'root' ? '▼' : '▶'}</span>` : '<span class="node-toggle"></span>';
        
        if (node.type !== 'root') {
            let recordCountStr = '';
            const count = side === 1 ? node.count1 : node.count2;
            if (count !== null && count !== undefined) {
                recordCountStr = `<span class="node-type" style="margin-left: 8px; color: #dcdcaa;">(${count} items)</span>`;
            }

            const containerStatus = (node.stats.modified > 0 || node.stats.added > 0 || node.stats.removed > 0) ? 'modified' : 'matched';
            const containerLabel = getStatusLabel(containerStatus, node.isIgnored);

            container.innerHTML = `
                <span class="node-header" onclick="toggleNode(this)">
                    ${toggle}
                    <span class="node-type">${typeIcon}</span>
                    <span class="node-key">${isRoot ? 'Root' : node.key}</span>
                    <span class="node-type">${node.type}</span>
                    ${recordCountStr}
                    ${containerLabel}
                    <span class="node-path">${node.path}</span>
                </span>`;
        }

        if (hasChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children' + (node.type === 'root' ? ' expanded' : '');
            
            for (const childEl of renderedChildren) {
                childrenContainer.appendChild(childEl);
            }
            
            container.appendChild(childrenContainer);
        }
    }

    return container;
}

function formatValue(value, forDisplay = false) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const type = typeof value;
    
    if (type === 'object') {
        if (Array.isArray(value)) {
            return `Array[${value.length}]`;
        }
        return '{...}';
    }
    
    if (type === 'string') {
        return `"${value}"`;
    }
    
    return String(value);
}

function toggleNode(el) {
    const header = el.closest('.node-header');
    const node = header.closest('.tree-node');
    const children = node.querySelector(':scope > .children');
    const toggle = header.querySelector('.node-toggle');
    
    if (children) {
        if (children.classList.contains('expanded')) {
            children.classList.remove('expanded');
            toggle.textContent = '▶';
        } else {
            children.classList.add('expanded');
            toggle.textContent = '▼';
        }
    }
}

window.toggleNode = toggleNode;
