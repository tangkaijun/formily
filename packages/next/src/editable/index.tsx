import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useField, useForm, observer, isVoidField } from '@formily/react'
import { isStr } from '@formily/shared'
import { Form, Balloon, ConfigProvider } from '@alifd/next'
import { EditOutlined, CloseOutlined } from '@ant-design/icons'
import { ItemProps as FormItemProps } from '@alifd/next/lib/form'
import { BalloonProps as PopoverProps } from '@alifd/next/lib/balloon'
import { useClickAway, usePrefixCls } from '../__builtins__'
import { Space } from '../space'
import cls from 'classnames'
/**
 * 默认Inline展示
 */

interface IPopoverProps extends PopoverProps {
  renderPreview?: (field: Formily.Core.Types.GeneralField) => React.ReactNode
}

type ComposedEditable = React.FC<FormItemProps> & {
  Popover?: React.FC<IPopoverProps>
}

const useEditable = (): [boolean, (payload: boolean) => void] => {
  const form = useForm()
  const field = useField<Formily.Core.Models.Field>()
  useLayoutEffect(() => {
    if (form.pattern === 'editable') {
      if (field.pattern === 'editable') {
        field.setPattern('readPretty')
      }
    }
  }, [])
  return [
    field.pattern === 'editable',
    (pyaload: boolean) => {
      field.setPattern(pyaload ? 'editable' : 'readPretty')
    },
  ]
}

const useFormItemProps = (): FormItemProps => {
  const field = useField()
  if (isVoidField(field)) {
    return {}
  } else {
    return {
      validateState: field.editable ? (field.validateStatus as any) : undefined,
      help: field.editable
        ? field.errors?.length
          ? field.errors
          : field.description
        : field.description,
    }
  }
}

export const Editable: ComposedEditable = observer((props) => {
  const [editable, setEditable] = useEditable()
  const itemProps = useFormItemProps()
  const field = useField<Formily.Core.Models.Field>()
  const basePrefixCls = usePrefixCls()
  const prefixCls = usePrefixCls('formily-editable')
  const ref = useRef<boolean>()
  const innerRef = useRef<HTMLDivElement>()
  const recover = () => {
    if (ref.current && !field?.errors?.length) {
      setEditable(false)
    }
  }
  const renderEditHelper = () => {
    if (editable) return
    return (
      <Form.Item {...itemProps}>
        <EditOutlined className={`${prefixCls}-edit-btn`} />
      </Form.Item>
    )
  }

  const renderCloseHelper = () => {
    if (!editable) return
    return (
      <Form.Item>
        <CloseOutlined className={`${prefixCls}-close-btn`} />
      </Form.Item>
    )
  }

  useClickAway((e) => {
    const target = e.target as HTMLElement
    if (target?.closest(`.${basePrefixCls}-overlay-wrapper`)) return
    recover()
  }, innerRef)

  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const target = e.target as HTMLElement
    const close = innerRef.current.querySelector(`.${prefixCls}-close-btn`)
    if (target?.contains(close) || close?.contains(target)) {
      recover()
    } else if (!ref.current) {
      setTimeout(() => {
        setEditable(true)
        setTimeout(() => {
          innerRef.current.querySelector('input')?.focus()
        })
      })
    }
  }

  ref.current = editable

  return (
    <div className={prefixCls} ref={innerRef} onClick={onClick}>
      <Space size={4} style={{ margin: '0 4px' }}>
        <Form.Item {...props} {...itemProps}>
          {props.children}
        </Form.Item>
        {renderEditHelper()}
        {renderCloseHelper()}
      </Space>
    </div>
  )
})

Editable.Popover = observer(({ renderPreview, ...props }) => {
  const field = useField<Formily.Core.Models.Field>()
  const refId = useMemo(() => `balloon_${new Date().getTime()}`, [])
  const [editable, setEditable] = useEditable()
  const [visible, setVisible] = useState(false)
  const [destroy, setDestroy] = useState(true)
  const prefixCls = usePrefixCls('formily-editable-popover')
  const preview = renderPreview?.(field)
  const placeholder = isStr(preview) ? preview : ''
  const closePopover = () => {
    const errors = field.form.queryFeedbacks({
      type: 'error',
      address: `*(${field.address},${field.address}.*)`,
    })
    if (errors?.length) return
    setVisible(false)
  }
  const openPopover = () => {
    setVisible(true)
    setDestroy(false)
    setEditable(true)
  }
  return (
    <ConfigProvider popupContainer={() => document.getElementById(refId)}>
      <Balloon
        {...props}
        id={refId}
        title={field.title}
        visible={visible && editable}
        className={cls(prefixCls, props.className)}
        onVisibleChange={(visible) => {
          if (visible) {
            openPopover()
          } else {
            closePopover()
          }
        }}
        afterClose={() => {
          setEditable(false)
          setDestroy(true)
        }}
        followTrigger
        triggerType="click"
        closable={false}
        trigger={
          <Form.Item className={`${prefixCls}-trigger`}>
            <Space size={4} style={{ margin: '0 4px' }}>
              <span className={`${prefixCls}-preview`}>
                {placeholder || field.title}
              </span>
              <EditOutlined className={`${prefixCls}-edit-btn`} />
            </Space>
          </Form.Item>
        }
      >
        {!destroy && props.children}
      </Balloon>
    </ConfigProvider>
  )
})