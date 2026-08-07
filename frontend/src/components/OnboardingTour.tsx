'use client'

import { useEffect, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  startTour?: boolean
  onTourEnd?: () => void
}

export function OnboardingTour({ startTour, onTourEnd }: OnboardingTourProps) {
  const initTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      doneBtnText: 'Понятно',
      nextBtnText: 'Далее',
      prevBtnText: 'Назад',
      onPopoverRender: (popover, { config, state }) => {
        // Apply custom styling
        popover.wrapper.classList.add('dark:bg-neutral-900', 'dark:text-white', 'dark:border-neutral-800')
      },
      onDestroyed: () => {
        if (onTourEnd) {
          onTourEnd()
        }
      },
      steps: [
        {
          element: '#tour-balance',
          popover: {
            title: 'Ваш баланс',
            description: 'Здесь отображается ваш текущий баланс средств. Они используются для отклика на заявки клиентов.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-crm',
          popover: {
            title: 'Моя CRM-доска',
            description: 'Управляйте всеми вашими клиентами, сеансами и этапами работы на удобной канбан-доске.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-feed',
          popover: {
            title: 'Маркетплейс лидов',
            description: 'Здесь появляются свежие заявки и заказы от клиентов. Откликайтесь первыми и предлагайте свои условия!',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-portfolio',
          popover: {
            title: 'Ваше портфолио',
            description: 'Загружайте фотографии лучших работ. Качественное портфолио привлекает больше внимания клиентов.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-messages',
          popover: {
            title: 'Сообщения и чаты',
            description: 'Здесь вы можете общаться с клиентами напрямую, обсуждать эскизы и назначать даты сеансов.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-profile',
          popover: {
            title: 'Профиль и настройки',
            description: 'Заполните свой профиль, настройте уведомления и переключайте режимы работы в любое время.',
            side: 'left',
            align: 'start'
          }
        }
      ]
    })

    driverObj.drive()
  }, [onTourEnd])

  useEffect(() => {
    if (startTour) {
      initTour()
    }
  }, [startTour, initTour])

  return null
}
