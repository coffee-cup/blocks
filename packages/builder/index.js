/* @jsx jsx */
import React, { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Styled, ThemeProvider, jsx } from 'theme-ui'
import { system } from '@theme-ui/presets'
import { Global } from '@emotion/core'

import {
  Label,
  Input
  // Select,
  // Textarea,
  // Radio,
  // Checkbox,
  // Slider
} from '@theme-ui/components'

import * as transforms from './transforms'
import * as queries from './queries'

import * as recipes from './recipes'
import pragma from './pragma'
import CODE from './fixture'

// TODO: Make this less hacky
import recipesSrc from 'raw-loader!./recipes.txt'

const theme = {
  ...system,
  styles: {
    ...system.styles,
    navlink: {
      color: 'inherit',
      textDecoration: 'none',
      fontWeight: 600
    }
  }
}

const Blocks = {}
Blocks.Root = React.Fragment

export default () => {
  const [code, setCode] = useState(null)
  const [transformedCode, setTransformedCode] = useState(null)
  const [elementId, setElementId] = useState(null)
  const [elementData, setElementData] = useState(null)
  const [components, setComponents] = useState(null)

  const scope = {
    Blocks,
    Styled,
    Link: Styled.a,
    jsx: pragma(setElementId),
    BLOCKS_Droppable: Droppable,
    BLOCKS_Draggable: Draggable,
    BLOCKS_DraggableInner: props => <div {...props} />,
    BLOCKS_DroppableInner: props => <div {...props} />,
    BLOCKS_Text: props => <span {...props} />,
    ...recipes
  }

  useEffect(() => {
    const newCode = transforms.addTuid(CODE)
    setCode(newCode)

    const exportedElements = queries.getExportedElements(recipesSrc)
    setComponents(exportedElements)
  }, [])

  const element = useMemo(() => {
    if (!transformedCode) {
      return null
    }

    /* eslint-disable */
    const fn = new Function(
      'React',
      ...Object.keys(scope),
      `${transformedCode};
      return React.createElement(BLOCKS_Container)`
    )
    /* eslint-enable */

    return fn(React, ...Object.values(scope))
  }, [transformedCode])

  useEffect(() => {
    if (!elementId) {
      return
    }

    const newElementData = queries.getCurrentElement(code, elementId)
    setElementData(newElementData)
  }, [elementId, code])

  useEffect(() => {
    try {
      const newTransformedCode = transforms.toTransformedJSX(code)

      if (newTransformedCode) {
        setTransformedCode(newTransformedCode)
      }
    } catch (e) {}
  }, [code])

  if (!code || !transformedCode) {
    return null
  }

  const onDragEnd = drag => {
    if (!drag.destination) {
      return
    }

    if (drag.source.droppableId === 'components') {
      const newCode = transforms.insertJSXBlock(code, { ...drag, components })
      setCode(newCode)
    } else {
      const newCode = transforms.reorderJSXBlocks(code, drag)
      setCode(newCode)
    }
  }

  const handleRemove = key => () => {
    const sx = elementData.props.sx || {}
    delete sx[key]

    setElementData({ ...elementData, props: { ...elementData.props, sx } })

    const { code: newCode } = transforms.removeSxProp(code, { elementId, key })
    setCode(newCode)
  }

  const handleRemoveElement = () => {
    const { code: newCode } = transforms.removeElement(code, { elementId })
    setCode(newCode)
    setElementId(null)
    setElementData(null)
  }

  const handleClone = () => {
    const { code: newCode } = transforms.cloneElement(code, { elementId })
    setCode(newCode)
  }

  const handleInsertElement = () => {
    const { code: newCode } = transforms.insertElementAfter(code, { elementId })
    setCode(newCode)
  }

  const handleTextUpdate = e => {
    const text = e.target.value
    setElementData({ ...elementData, text })

    const { code: newCode } = transforms.replaceText(code, { text, elementId })
    setCode(newCode)
  }

  const handleChange = key => e => {
    const sx = elementData.props.sx || {}
    sx[key] = e.target.value

    setElementData({ ...elementData, props: { ...elementData.props, sx } })

    const { code: newCode } = transforms.applySxProp(code, {
      elementId,
      key,
      value: e.target.value
    })

    setCode(newCode)
  }

  const handleParentSelect = () => {
    if (elementData.parentId) {
      setElementId(elementData.parentId)
    }
  }

  const handlePropChange = key => e => {
    setElementData({
      ...elementData,
      props: { ...elementData.props, [key]: e.target.value }
    })

    const { code: newCode } = transforms.applyProp(code, {
      elementId,
      key,
      value: e.target.value
    })

    setCode(newCode)
  }

  return (
    <ThemeProvider theme={theme}>
      <Styled.root>
        <Global
          styles={{
            '*': {
              boxSizing: 'border-box'
            },
            body: {
              margin: 0
            }
          }}
        />
        <div
          sx={{
            display: 'flex',
            width: '100%',
            padding: 3,
            borderBottom: 'thin solid #e1e6eb'
          }}
        >
          <h3 sx={{ fontWeight: 'normal', m: 0 }}>Blocks</h3>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            sx={{
              display: 'flex',
              width: '100%'
            }}
          >
            <div
              sx={{
                borderRight: 'thin solid #e1e6eb',
                width: '15%',
                minHeight: '100vh',
                overflow: 'scroll'
              }}
            >
              <h3
                sx={{
                  textTransform: 'uppercase',
                  fontSize: 2,
                  fontWeight: 600,
                  m: 0,
                  px: 3,
                  py: 1,
                  borderBottom: 'thin solid #e1e6eb'
                }}
              >
                Components
              </h3>
              <Droppable droppableId="components">
                {(provided, snapshot) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {Object.keys(recipes).map((key, i) => (
                      <Draggable key={key} draggableId={key} index={i + 1}>
                        {(provided, snapshot) => {
                          const Component = recipes[key]

                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                transform: 'scale(.6)'
                              }}
                            >
                              <Component />
                            </div>
                          )
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            <div
              sx={{
                width: '60%',
                backgroundColor: 'white',
                padding: 20,
                minHeight: '100vh'
              }}
            >
              {element}
            </div>
            <div
              sx={{
                borderLeft: 'thin solid #e1e6eb',
                width: '25%',
                minHeight: '100vh'
              }}
            >
              {elementData && (
                <h3
                  sx={{
                    textTransform: 'uppercase',
                    fontSize: 2,
                    fontWeight: 600,
                    m: 0,
                    px: 3,
                    py: 1,
                    borderBottom: 'thin solid #e1e6eb'
                  }}
                >
                  {elementData.name}
                  <button onClick={handleRemoveElement}>Remove</button>
                  <button onClick={handleInsertElement}>Insert</button>
                  <button onClick={handleClone}>Clone</button>
                  {elementData.parentId && (
                    <button onClick={handleParentSelect}>Parent</button>
                  )}
                </h3>
              )}
              <div
                sx={{
                  minHeight: '80vh',
                  backgroundColor: '#fafbfc'
                }}
              >
                {elementData && (
                  <div sx={{ px: 3 }}>
                    {elementData.text && (
                      <React.Fragment>
                        <Label>Text</Label>
                        <Input
                          sx={{
                            display: 'block',
                            width: '100%'
                          }}
                          onChange={handleTextUpdate}
                          value={elementData.text}
                        />
                      </React.Fragment>
                    )}
                    <h3 sx={{ fontWeight: 'normal', m: 0, pb: 2, pt: 4 }}>
                      Props
                    </h3>
                    {elementData.props.hasOwnProperty('to') && (
                      <React.Fragment>
                        <Label>To</Label>
                        <Input
                          sx={{
                            display: 'block',
                            width: '100%'
                          }}
                          onChange={handlePropChange('to')}
                          value={elementData.props.to || ''}
                        />
                      </React.Fragment>
                    )}
                    <h3
                      sx={{
                        fontWeight: 'normal',
                        mt: 4,
                        mb: 0,
                        pt: 4,
                        borderTop: 'thin solid'
                      }}
                    >
                      Styles
                    </h3>
                    {elementData.props.sx && (
                      <React.Fragment>
                        <Label>Padding</Label>
                        <Input
                          sx={{
                            display: 'block',
                            width: '100%'
                          }}
                          onChange={handleChange('p')}
                          value={elementData.props.sx.p}
                        />
                        <button onClick={handleRemove('p')}>Remove</button>
                      </React.Fragment>
                    )}
                    <React.Fragment>
                      <Label>Background</Label>
                      <Input
                        sx={{
                          display: 'block',
                          width: '100%'
                        }}
                        onChange={handleChange('background')}
                        value={elementData.props.sx.backgroundColor}
                      />
                      <button onClick={handleRemove('background')}>
                        Remove
                      </button>
                    </React.Fragment>
                    <React.Fragment>
                      <Label>Color</Label>
                      <Input
                        sx={{
                          display: 'block',
                          width: '100%'
                        }}
                        onChange={handleChange('color')}
                        value={elementData.props.sx.color}
                      />
                      <button onClick={handleRemove('color')}>Remove</button>
                    </React.Fragment>
                    <h3
                      sx={{
                        fontWeight: 'normal',
                        mt: 4,
                        mb: 0,
                        pt: 4,
                        borderTop: 'thin solid'
                      }}
                    >
                      Variant
                    </h3>
                    {elementData.props.sx && elementData.props.sx.variant && (
                      <React.Fragment>
                        <Label>
                          {elementData.props.sx.variant.replace('styles.', '')}
                        </Label>
                        <Input
                          sx={{
                            display: 'block',
                            width: '100%'
                          }}
                          onChange={handleChange('variant')}
                          value={elementData.props.sx.variant}
                        />
                      </React.Fragment>
                    )}
                    <pre>{JSON.stringify(elementData, null, 2)}</pre>
                  </div>
                )}
              </div>
              <textarea
                sx={{
                  p: 3,
                  width: '100%',
                  height: '20vh',
                  fontSize: 16,
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderTop: 'thin solid #e1e6eb',
                  fontFamily: 'monospace'
                }}
                onChange={e => setCode(e.target.value)}
                value={transforms.toRawJSX(code)}
              />
            </div>
          </div>
        </DragDropContext>
      </Styled.root>
    </ThemeProvider>
  )
}