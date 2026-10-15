import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const protocolsDir = path.join(projectRoot, 'frontend', 'public', 'protocols')
const files = ['cpr.json', 'bleeding.json', 'choking.json']

let hasError = false

for (const file of files) {
  const filePath = path.join(protocolsDir, file)
  if (!fs.existsSync(filePath)) {
    console.error(`Missing protocol file: ${file}`)
    hasError = true
    continue
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const tree = JSON.parse(raw)

    if (!tree.id || !tree.title || !tree.start || !tree.nodes) {
      console.error(`Invalid structure in ${file}: missing id, title, start, or nodes`)
      hasError = true
      continue
    }

    if (!tree.nodes[tree.start]) {
      console.error(`Start node "${tree.start}" not found in nodes for ${file}`)
      hasError = true
      continue
    }

    const nodeIds = Object.keys(tree.nodes)
    for (const [nodeId, node] of Object.entries(tree.nodes)) {
      if (!node.type || !node.text) {
        console.error(`Node "${nodeId}" in ${file} missing type or text`)
        hasError = true
      }

      // Check outgoing links
      const targets = []
      if (node.next) targets.push(node.next)
      if (node.yes) targets.push(node.yes)
      if (node.no) targets.push(node.no)

      for (const t of targets) {
        if (!tree.nodes[t]) {
          console.error(`Broken reference: node "${nodeId}" references non-existent node "${t}" in ${file}`)
          hasError = true
        }
      }

      if (node.type === 'end' && targets.length > 0) {
        console.warn(`Warning: end node "${nodeId}" has outgoing targets in ${file}`)
      }
    }
    console.log(`✓ Validated ${file}: ${nodeIds.length} nodes`)
  } catch (err) {
    console.error(`Error parsing ${file}: ${err.message}`)
    hasError = true
  }
}

if (hasError) {
  console.error('\nProtocol validation failed!')
  process.exit(1)
} else {
  console.log('\nAll protocol trees are valid!')
}
