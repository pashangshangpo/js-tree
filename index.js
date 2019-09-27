/**
 * @file js-tree
 * @author xzh
 * @date 2019-09-24 09:15:47
 */

module.exports = class Tree {
    constructor(obj, childNodeName = 'children') {
        const json = obj || {
            [childNodeName]: []
        }

        this.cnt = 1
        this.indexes = {}
        this.childNodeName = childNodeName
        this.getJSON = () => JSON.parse(JSON.stringify(json))

        this.build(json)
    }

    build(obj) {
        const indexes = this.indexes
        const startId = this.cnt
        const self = this
        const index = {
            id: startId,
            node: obj
        }

        indexes[this.cnt + ''] = index

        this.cnt += 1

        if (obj[self.childNodeName] && obj[self.childNodeName].length) {
            walk(obj[self.childNodeName], index)
        }

        function walk(objs, parent) {
            const children = []

            objs.forEach(function (obj, i) {
                const index = {
                    id: self.cnt,
                    node: obj,
                }

                if (parent) {
                    index.parent = parent.id
                }

                indexes[self.cnt + ''] = index

                children.push(self.cnt)

                self.cnt += 1

                if (obj[self.childNodeName] && obj[self.childNodeName].length) {
                    walk(obj[self.childNodeName], index)
                }
            })

            parent[self.childNodeName] = children

            children.forEach(function (id, i) {
                const index = indexes[id + '']

                if (i > 0) {
                    index.prev = children[i - 1]
                }

                if (i < children.length - 1) {
                    index.next = children[i + 1]
                }
            })
        }

        return index
    }

    getIndex(id) {
        const index = this.indexes[id]

        if (index) {
            return index
        }
    }

    /**
     * 获取指定节点最底层节点ID
     * @param {String} id 节点ID
     * @param {Boolean} open 是否只获取打开的子节点
     */
    getTreeLastId(id, open = true) {
        const node = this.getIndex(id)
        const isGetChild = !open || (open && !node.node.collapsed)

        if (isGetChild && node.children && node.children.length > 0) {
            const lastId = node.children[node.children.length - 1]

            return this.getTreeLastId(lastId)
        }

        return id
    }

    /**
     * 获取上一个节点
     * @param {String} id 节点ID
     * @param {Boolean} open 是否只获取打开的子节点
     */
    getTreePrevId(id, open = true) {
        const node = this.getIndex(id)

        if (node.prev == null) {
            return node.parent
        }

        return this.getTreeLastId(node.prev, open)
    }

    /**
     * 获取下一个节点
     * @param {String} id 节点ID
     * @param {Boolean} open 是否只获取打开的子节点
     */
    getTreeNextId(id, open = true) {
        const node = this.getIndex(id)
        const isGetChild = !open || (open && !node.node.collapsed)

        if (isGetChild && node.children && node.children.length > 0) {
            const firstId = node.children[0]

            return firstId
        }

        if (node.next != null) {
            return node.next
        }

        const getNext = (id) => {
            const node = this.getIndex(id)

            if (node.next != null) {
                return node.next
            }

            if (node.id === 1 || node.parent === 1) {
                return 1
            }

            return getNext(node.parent)
        }

        return getNext(node.parent)
    }

    removeIndex(index) {
        const self = this

        del(index)

        function del(index) {
            delete self.indexes[index.id + '']

            if (index[self.childNodeName] && index[self.childNodeName].length) {
                index[self.childNodeName].forEach(function (child) {
                    del(self.getIndex(child))
                })
            }
        }
    }

    get(id) {
        const index = this.getIndex(id)

        if (index && index.node) {
            return index.node
        }

        return null
    }

    remove(id) {
        const index = this.getIndex(id)
        const node = this.get(id)
        const parentIndex = this.getIndex(index.parent)
        const parentNode = this.get(index.parent)

        parentNode[this.childNodeName].splice(
            parentNode[this.childNodeName].indexOf(node),
            1
        )

        parentIndex[this.childNodeName].splice(
            parentIndex[this.childNodeName].indexOf(id),
            1
        )

        this.removeIndex(index)
        this.updateChildren(parentIndex[this.childNodeName])

        return node
    }

    updateChildren(children) {
        children.forEach(
            function (id, i) {
                const index = this.getIndex(id)

                index.prev = index.next = null

                if (i > 0) {
                    index.prev = children[i - 1]
                }

                if (i < children.length - 1) {
                    index.next = children[i + 1]
                }
            }.bind(this)
        )
    }

    insert(obj, parentId, i) {
        const parentIndex = this.getIndex(parentId)
        const parentNode = this.get(parentId)
        const index = this.build(obj)

        index.parent = parentId

        parentNode[this.childNodeName] = parentNode[this.childNodeName] || []
        parentIndex[this.childNodeName] = parentIndex[this.childNodeName] || []

        parentNode[this.childNodeName].splice(i, 0, obj)
        parentIndex[this.childNodeName].splice(i, 0, index.id)

        this.updateChildren(parentIndex[this.childNodeName])

        if (parentIndex.parent) {
            this.updateChildren(
                this.getIndex(parentIndex.parent)[this.childNodeName]
            )
        }

        return index
    }

    insertBefore(obj, destId) {
        const destIndex = this.getIndex(destId)
        
        if (destIndex == null) {
            return null
        }

        const parentId = destIndex.parent
        const i = this.getIndex(parentId)[this.childNodeName].indexOf(destId)

        return this.insert(obj, parentId, i)
    }

    insertAfter(obj, destId) {
        const destIndex = this.getIndex(destId)

        if (destIndex == null) {
            return null
        }

        const parentId = destIndex.parent
        const i = this.getIndex(parentId)[this.childNodeName].indexOf(destId)

        return this.insert(obj, parentId, i + 1)
    }

    prepend(obj, destId) {
        return this.insert(obj, destId, 0)
    }

    append(obj, destId) {
        const destIndex = this.getIndex(destId)

        destIndex[this.childNodeName] = destIndex[this.childNodeName] || []

        return this.insert(obj, destId, destIndex[this.childNodeName].length)
    }

    /**
     * 展开
     * @param {Number} destId 目标ID
     */
    open(destId) {
        const dest = this.getIndex(destId)

        delete dest.node.collapsed
    }

    /**
     * 展开所有节点
     * @param {Number} destId 目标ID
     */
    openAll(destId) {
        const dest = this.getIndex(destId)

        delete dest.node.collapsed

        if (dest.children) {
            for (let id of dest.children) {
                this.openAll(id)
            }
        }
    }

    /**
     * 收起节点
     * @param {Number} destId 目标ID
     */
    close(destId) {
        const dest = this.getIndex(destId)

        dest.node.collapsed = true
    }

    /**
     * 收起所有节点
     * @param {Number} destId 目标ID
     */
    closeAll(destId) {
        const dest = this.getIndex(destId)

        dest.node.collapsed = true

        if (dest.children) {
            for (let id of dest.children) {
                this.closeAll(id)
            }
        }
    }
}
