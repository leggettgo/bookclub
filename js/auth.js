if (localStorage.getItem('bookclub_auth') !== CORRECT_HASH) {
    window.location.replace('password.html');
}
