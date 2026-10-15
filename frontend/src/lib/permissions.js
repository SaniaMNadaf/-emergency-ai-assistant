export async function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

export async function requestMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, error: 'getUserMedia not supported' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return { supported: true }
  } catch (err) {
    return { supported: false, error: err.message }
  }
}

export async function requestCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, error: 'getUserMedia not supported' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    stream.getTracks().forEach((t) => t.stop())
    return { supported: true }
  } catch (err) {
    return { supported: false, error: err.message }
  }
}

export async function requestNotification() {
  if (!('Notification' in window)) {
    return { supported: false, error: 'Notifications not supported' }
  }
  if (Notification.permission === 'granted') return { supported: true, permission: 'granted' }
  if (Notification.permission === 'denied') return { supported: false, error: 'Notifications denied' }
  const permission = await Notification.requestPermission()
  return { supported: permission === 'granted', permission }
}
