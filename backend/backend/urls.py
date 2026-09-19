"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),

    # Uploaded avatars. django.conf.urls.static.static() only registers this
    # when DEBUG=True, which left /media/ dead in the cluster; registering the
    # view directly serves them in every environment. MEDIA_ROOT is a dedicated
    # directory holding nothing but avatars, so there is no wider tree to leak.
    # Small files, few requests - if that ever changes, put a real web server
    # in front of MEDIA_ROOT instead of serving them through Django.
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
