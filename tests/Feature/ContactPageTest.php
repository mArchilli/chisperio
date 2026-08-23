<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContactPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_page_can_be_rendered(): void
    {
        $this->get(route('contacto.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Contacto')
                ->where('canLogin', true)
            );
    }
}
