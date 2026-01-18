const themeStore = $state<{ value: 'dark' | 'light' }>({ value: 'light' });

export function isDark(): boolean {
    return themeStore.value === 'dark';
}

export function setTheme(newTheme: 'dark' | 'light') {
    themeStore.value = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme-preference', newTheme);
}
